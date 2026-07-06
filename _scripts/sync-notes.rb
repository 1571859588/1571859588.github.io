#!/usr/bin/env ruby
# Standalone script: sync notes-src/ → _notes/
# Runs as pre-build step in GitHub Actions (pure Ruby, no Jekyll dep).
# Also loaded by _plugins/notes-sync.rb for local Jekyll builds.

require 'fileutils'

module NotesSync
  SRC_DIR  = File.expand_path(File.join(__dir__, '..', 'notes-src'))
  DST_DIR  = File.expand_path(File.join(__dir__, '..', '_notes'))

  def self.extract_order(name)
    match = name.match(/^(\d+)\.\s*/)
    match ? match[1].to_i : nil
  end

  def self.strip_order_prefix(name)
    name.sub(/^\d+\.\s*/, '')
  end

  def self.slugify(str)
    str.downcase
       .gsub(/[^a-z0-9]+/, '-')
       .gsub(/-{2,}/, '-')
       .gsub(/^-|-$/, '')
  end

  def self.scan_dir(dir_path, section_path: nil, level: 0)
    entries = []
    return entries unless Dir.exist?(dir_path)

    subdirs = []
    md_files = []

    Dir.children(dir_path).sort.each do |name|
      full = File.join(dir_path, name)
      next if name.start_with?('.')
      next if name.end_with?('.assets')
      next unless File.directory?(full) || name.end_with?('.md')

      if File.directory?(full)
        subdirs << { name: name, path: full }
      else
        md_files << { name: name, path: full }
      end
    end

    md_files.each do |f|
      base = f[:name].sub(/\.md$/, '')
      entries << {
        title:        strip_order_prefix(base),
        order:        extract_order(base),
        ctime:        File.ctime(f[:path]),
        source_path:  f[:path],
        section_path: section_path,
        is_section:   false,
        level:        level
      }
    end

    subdirs.each do |d|
      base = d[:name]
      s_title = strip_order_prefix(base)
      new_section = section_path && !section_path.empty? ?
        File.join(section_path, s_title) : s_title

      sub = scan_dir(d[:path], section_path: new_section, level: level + 1)
      unless sub.empty?
        entries << {
          title:        s_title,
          order:        extract_order(base),
          ctime:        File.ctime(d[:path]),
          source_path:  nil,
          section_path: section_path,
          is_section:   true,
          level:        level
        }
      end
      entries.concat(sub)
    end

    entries.sort_by! { |e| e[:order] ? [0, e[:order], e[:ctime]] : [1, 0, e[:ctime]] }
    entries
  end

  def self.generate!(src, dst, config)
    return unless Dir.exist?(src)

    FileUtils.rm_rf(dst) if Dir.exist?(dst)
    FileUtils.mkdir_p(dst)

    config.notes_series = [] unless config.respond_to?(:notes_series)

    Dir.children(src).sort.each do |series_dir|
      series_path = File.join(src, series_dir)
      next unless File.directory?(series_path)
      next if series_dir.start_with?('.')

      series_title = strip_order_prefix(series_dir)
      entries = scan_dir(series_path)
      notes = entries.reject { |e| e[:is_section] }
      next if notes.empty?

      notes.each_with_index do |entry, idx|
        safe = slugify(entry[:title])
        safe = "note" if safe.empty?
        out = File.join(dst, "#{safe}.md")
        counter = 1
        while File.exist?(out)
          out = File.join(dst, "#{safe}-#{counter}.md")
          counter += 1
        end

        section = entry[:section_path] || ""

        File.open(out, 'w', encoding: 'UTF-8') do |f|
          f.puts "---"
          f.puts "layout: notes"
          f.puts "title: \"#{entry[:title].gsub('"', '\"')}\""
          f.puts "series: #{slugify(series_title)}"
          f.puts "series_title: \"#{series_title.gsub('"', '\"')}\""
          f.puts "series_order: #{idx + 1}"
          f.puts "section: \"#{section.gsub('"', '\"')}\""
          f.puts "---"
          f.puts
          f.write File.read(entry[:source_path], encoding: 'UTF-8')
        end
      end

      config.notes_series << {
        'id'         => slugify(series_title),
        'title'      => series_title,
        'note_count' => notes.size
      }
    end

    config.notes_series.sort_by! { |s| s['title'] }
  end
end

# When run directly (CLI / GitHub Actions pre-build step)
if __FILE__ == $PROGRAM_NAME
  require 'ostruct'
  cfg = OpenStruct.new
  NotesSync.generate!(NotesSync::SRC_DIR, NotesSync::DST_DIR, cfg)
  puts "Synced: #{cfg.notes_series.map { |s| "#{s['title']} (#{s['note_count']})" }.join(', ')}"
end
