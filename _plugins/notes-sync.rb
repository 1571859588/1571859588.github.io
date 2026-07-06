# Jekyll plugin: auto-sync notes-src/ → _notes/
#
# Scans notes-src/ directory and generates proper Jekyll collection
# files in _notes/ with extracted frontmatter.
#
# Directory structure:
#   notes-src/                    ← Root (copy your local notes here)
#   ├── Series A/                 ← Top-level dir = series
#   │   ├── 1. Note Title.md      ← N. prefix = order
#   │   ├── 2. Another Note.md
#   │   ├── 2. Another Note.assets/  ← Images for the note
#   │   ├── Section Name/         ← Subdir = section (grouping)
#   │   │   ├── 1. Sub Note.md
#   │   │   └── 2. Sub Note.assets/
#   │   └── Uncategorized Note.md ← No N. prefix → ordered by ctime
#   └── Series B/
#       └── ...
#
# Ordering rules:
#   1. Filenames/dirnames starting with "N." use N as order
#   2. Items without "N." prefix are ordered by file creation time
#   3. Numbered items always come before unnumbered items

require 'fileutils'

NOTES_SRC  = File.join(Dir.pwd, 'notes-src')
NOTES_DST  = File.join(Dir.pwd, '_notes')

module Jekyll
  module NotesSync
    # Extract order number from name like "3. Something" → 3
    def self.extract_order(name)
      match = name.match(/^(\d+)\.\s*/)
      match ? match[1].to_i : nil
    end

    # Strip order prefix from name: "3. Something" → "Something"
    def self.strip_order_prefix(name)
      name.sub(/^\d+\.\s*/, '')
    end

    # Slugify a string for use in filenames and URLs
    def self.slugify(str)
      str.downcase
         .gsub(/[^a-z0-9一-鿿\-]+/, '-')
         .gsub(/-{2,}/, '-')
         .gsub(/^-|-$/, '')
    end

    # Recursively scan a directory and collect markdown files with metadata
    def self.scan_dir(dir_path, series_title: nil, section_path: nil, level: 0)
      entries = []

      return entries unless Dir.exist?(dir_path)

      # Separate subdirectories and markdown files
      subdirs = []
      md_files = []

      Dir.children(dir_path).sort.each do |name|
        full_path = File.join(dir_path, name)
        next if name.start_with?('.')           # skip hidden files
        next if name.end_with?('.assets')        # skip .assets dirs (handled separately)
        next unless File.directory?(full_path) || name.end_with?('.md')

        if File.directory?(full_path)
          subdirs << { name: name, path: full_path }
        elsif name.end_with?('.md')
          md_files << { name: name, path: full_path }
        end
      end

      # Process markdown files at this level
      md_files.each do |file|
        base_name = file[:name].sub(/\.md$/, '')
        order = extract_order(base_name)
        title = strip_order_prefix(base_name)
        ctime = File.ctime(file[:path])

        entries << {
          title: title,
          order: order,
          ctime: ctime,
          source_path: file[:path],
          section_path: section_path,
          is_section: false,
          level: level
        }
      end

      # Process subdirectories (they become sections if they contain .md files)
      subdirs.each do |dir|
        base_name = dir[:name]
        section_order = extract_order(base_name)
        section_title = strip_order_prefix(base_name)

        # Build section path
        if section_path.nil? || section_path.empty?
          new_section = section_title
        else
          new_section = File.join(section_path, section_title)
        end

        # Recursively scan the subdirectory
        sub_entries = scan_dir(
          dir[:path],
          series_title: series_title,
          section_path: new_section,
          level: level + 1
        )

        unless sub_entries.empty?
          # Add a section header entry (used for sidebar grouping)
          entries << {
            title: section_title,
            order: section_order,
            ctime: File.ctime(dir[:path]),
            source_path: nil,
            section_path: section_path,
            is_section: true,
            level: level
          }
        end

        entries.concat(sub_entries)
      end

      # Sort: numbered items first (by order), then unnumbered (by ctime)
      entries.sort_by! do |e|
        if e[:order]
          [0, e[:order], e[:ctime]]
        else
          [1, 0, e[:ctime]]
        end
      end

      entries
    end

    # Generate _notes/ file with proper frontmatter
    def self.generate_note_file(entry, series_title, series_slug, output_dir, all_entries_in_series)
      # Create a safe filename for the output
      safe_filename = slugify(entry[:title])
      safe_filename = "note" if safe_filename.empty?

      # Ensure uniqueness
      output_path = File.join(output_dir, "#{safe_filename}.md")
      counter = 1
      while File.exist?(output_path)
        output_path = File.join(output_dir, "#{safe_filename}-#{counter}.md")
        counter += 1
      end

      # Determine series_order from position in sorted entries
      note_entries = all_entries_in_series.reject { |e| e[:is_section] }
      order_index = note_entries.index { |e| e[:source_path] == entry[:source_path] }
      series_order = order_index ? order_index + 1 : 999

      # Build section path for frontmatter
      section = entry[:section_path] || ""

      # Read original content
      content = File.read(entry[:source_path], encoding: 'UTF-8')

      # Write the generated file
      File.open(output_path, 'w', encoding: 'UTF-8') do |f|
        f.puts "---"
        f.puts "layout: notes"
        f.puts "title: \"#{entry[:title].gsub('"', '\"')}\""
        f.puts "series: #{series_slug}"
        f.puts "series_title: \"#{series_title.gsub('"', '\"')}\""
        f.puts "series_order: #{series_order}"
        f.puts "section: \"#{section.gsub('"', '\"')}\""
        f.puts "---"
        f.puts
        f.write content
      end

      output_path
    end

    # Main sync function
    def self.sync(site)
      return unless Dir.exist?(NOTES_SRC)

      # Collect all series info for later use (hub page needs this)
      site.config['notes_series'] = []

      # Prepare output directory
      FileUtils.rm_rf(NOTES_DST)
      FileUtils.mkdir_p(NOTES_DST)

      # Scan top-level directories (these are the series)
      Dir.children(NOTES_SRC).sort.each do |series_dir_name|
        series_path = File.join(NOTES_SRC, series_dir_name)
        next unless File.directory?(series_path)
        next if series_dir_name.start_with?('.')

        series_order = extract_order(series_dir_name)
        series_title = strip_order_prefix(series_dir_name)
        series_slug  = slugify(series_title)
        series_slug  = series_dir_name if series_slug.empty?

        # Scan all entries in this series
        entries = scan_dir(series_path,
                           series_title: series_title,
                           section_path: nil,
                           level: 0)

        # Filter out section headers, keep only actual notes
        note_entries = entries.reject { |e| e[:is_section] }

        next if note_entries.empty?

        # Collect section info for sidebar
        sections = []
        entries.select { |e| e[:is_section] }.each do |sec|
          sections << { title: sec[:title], path: sec[:section_path] }
        end

        # Store series info for hub page
        site.config['notes_series'] << {
          'id' => series_slug,
          'title' => series_title,
          'order' => series_order,
          'note_count' => note_entries.size,
          'first_note_url' => nil  # will be set after generation
        }

        # Generate _notes/ files for each note in this series
        note_entries.each do |entry|
          output_path = generate_note_file(
            entry,
            series_title,
            series_slug,
            NOTES_DST,
            note_entries
          )

          # Set first note URL for the series (hub links)
          series_info = site.config['notes_series'].last
          if series_info && series_info['first_note_url'].nil?
            # Calculate URL from output path
            rel_path = output_path.sub(NOTES_DST, '').sub(/^\//, '').sub(/\.md$/, '')
            series_info['first_note_url'] = "/notes/#{rel_path}/"
          end
        end

        Jekyll.logger.info "  Notes Sync: #{series_title} → #{note_entries.size} notes"
      end

      # Sort series by order
      site.config['notes_series'].sort_by! { |s| [s['order'] || 999, s['title']] }

      Jekyll.logger.info "Notes Sync: #{site.config['notes_series'].size} series synced"
    end
  end
end

# Hook: sync before Jekyll reads collections (after_init → before site read)
Jekyll::Hooks.register :site, :after_init do |site|
  Jekyll::NotesSync.sync(site)
end
