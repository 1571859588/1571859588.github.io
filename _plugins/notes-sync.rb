# Jekyll plugin: delegates to _scripts/sync-notes.rb
# This is the Jekyll-specific entry point. The sync logic is in the standalone
# script so it can also be run in GitHub Actions (where Jekyll safe-mode
# disables _plugins/).

require_relative '../_scripts/sync-notes'

Jekyll::Hooks.register :site, :after_init do |site|
  # site.config acts as the config object for the sync script
  sync_config = Struct.new(:notes_series).new([])
  SyncNotes.generate!(SyncNotes::SRC_DIR, SyncNotes::DST_DIR, sync_config)
  site.config['notes_series'] = sync_config.notes_series
end
