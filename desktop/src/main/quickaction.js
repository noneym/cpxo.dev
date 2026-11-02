// macOS Finder Quick Action: "Upload to cpxo and copy link" in the right-click
// menu (Quick Actions submenu, also under Services). It is an Automator
// workflow in ~/Library/Services that hands the selected files to the app with
// `open -b dev.cpxo.desktop`, which arrives as the open-file event.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const log = require('./logger');

const NAME = 'Upload to cpxo and copy link';
const BUNDLE_ID = 'dev.cpxo.desktop';

function workflowDir() {
  return path.join(os.homedir(), 'Library', 'Services', `${NAME}.workflow`);
}

function xml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function infoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSServices</key>
  <array>
    <dict>
      <key>NSMenuItem</key>
      <dict>
        <key>default</key>
        <string>${xml(NAME)}</string>
      </dict>
      <key>NSMessage</key>
      <string>runWorkflowAsService</string>
      <key>NSRequiredContext</key>
      <dict>
        <key>NSApplicationIdentifier</key>
        <string>com.apple.finder</string>
      </dict>
      <key>NSSendFileTypes</key>
      <array>
        <string>public.item</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;
}

function documentWflow() {
  const script = `open -b ${BUNDLE_ID} "$@"`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AMApplicationBuild</key>
  <string>521</string>
  <key>AMApplicationVersion</key>
  <string>2.10</string>
  <key>AMDocumentVersion</key>
  <string>2</string>
  <key>actions</key>
  <array>
    <dict>
      <key>action</key>
      <dict>
        <key>AMAccepts</key>
        <dict>
          <key>Container</key>
          <string>List</string>
          <key>Optional</key>
          <true/>
          <key>Types</key>
          <array>
            <string>com.apple.cocoa.string</string>
          </array>
        </dict>
        <key>AMActionVersion</key>
        <string>2.0.3</string>
        <key>AMApplication</key>
        <array>
          <string>Automator</string>
        </array>
        <key>AMParameterProperties</key>
        <dict>
          <key>COMMAND_STRING</key>
          <dict/>
          <key>CheckedForUserDefaultShell</key>
          <dict/>
          <key>inputMethod</key>
          <dict/>
          <key>shell</key>
          <dict/>
          <key>source</key>
          <dict/>
        </dict>
        <key>AMProvides</key>
        <dict>
          <key>Container</key>
          <string>List</string>
          <key>Types</key>
          <array>
            <string>com.apple.cocoa.string</string>
          </array>
        </dict>
        <key>ActionBundlePath</key>
        <string>/System/Library/Automator/Run Shell Script.action</string>
        <key>ActionName</key>
        <string>Run Shell Script</string>
        <key>ActionParameters</key>
        <dict>
          <key>COMMAND_STRING</key>
          <string>${xml(script)}</string>
          <key>CheckedForUserDefaultShell</key>
          <true/>
          <key>inputMethod</key>
          <integer>1</integer>
          <key>shell</key>
          <string>/bin/zsh</string>
          <key>source</key>
          <string></string>
        </dict>
        <key>BundleIdentifier</key>
        <string>com.apple.RunShellScript</string>
        <key>CFBundleVersion</key>
        <string>2.0.3</string>
        <key>CanShowSelectedItemsWhenRun</key>
        <false/>
        <key>CanShowWhenRun</key>
        <true/>
        <key>Category</key>
        <array>
          <string>AMCategoryUtilities</string>
        </array>
        <key>Class Name</key>
        <string>RunShellScriptAction</string>
        <key>InputUUID</key>
        <string>1C0C9D3A-5A4B-4D1E-9C6B-5F0D1E2A3B4C</string>
        <key>Keywords</key>
        <array>
          <string>Shell</string>
          <string>Script</string>
          <string>Command</string>
          <string>Run</string>
          <string>Unix</string>
        </array>
        <key>OutputUUID</key>
        <string>2D1D0E4B-6B5C-4E2F-8D7C-6A1E2F3B4C5D</string>
        <key>UUID</key>
        <string>3E2E1F5C-7C6D-4F3A-9E8D-7B2F3A4C5D6E</string>
        <key>UnlocalizedApplications</key>
        <array>
          <string>Automator</string>
        </array>
        <key>arguments</key>
        <dict>
          <key>0</key>
          <dict>
            <key>default value</key>
            <integer>0</integer>
            <key>name</key>
            <string>inputMethod</string>
            <key>required</key>
            <string>0</string>
            <key>type</key>
            <string>0</string>
            <key>uuid</key>
            <string>0</string>
          </dict>
          <key>1</key>
          <dict>
            <key>default value</key>
            <false/>
            <key>name</key>
            <string>CheckedForUserDefaultShell</string>
            <key>required</key>
            <string>0</string>
            <key>type</key>
            <string>0</string>
            <key>uuid</key>
            <string>1</string>
          </dict>
          <key>2</key>
          <dict>
            <key>default value</key>
            <string></string>
            <key>name</key>
            <string>source</string>
            <key>required</key>
            <string>0</string>
            <key>type</key>
            <string>0</string>
            <key>uuid</key>
            <string>2</string>
          </dict>
          <key>3</key>
          <dict>
            <key>default value</key>
            <string></string>
            <key>name</key>
            <string>COMMAND_STRING</string>
            <key>required</key>
            <string>0</string>
            <key>type</key>
            <string>0</string>
            <key>uuid</key>
            <string>3</string>
          </dict>
          <key>4</key>
          <dict>
            <key>default value</key>
            <string>/bin/sh</string>
            <key>name</key>
            <string>shell</string>
            <key>required</key>
            <string>0</string>
            <key>type</key>
            <string>0</string>
            <key>uuid</key>
            <string>4</string>
          </dict>
        </dict>
        <key>isViewVisible</key>
        <integer>1</integer>
        <key>location</key>
        <string>309.000000:253.000000</string>
        <key>nibPath</key>
        <string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
      </dict>
      <key>isViewVisible</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>connectors</key>
  <dict/>
  <key>workflowMetaData</key>
  <dict>
    <key>applicationBundleID</key>
    <string>com.apple.finder</string>
    <key>applicationBundleIDsByPath</key>
    <dict>
      <key>/System/Library/CoreServices/Finder.app</key>
      <string>com.apple.finder</string>
    </dict>
    <key>applicationPath</key>
    <string>/System/Library/CoreServices/Finder.app</string>
    <key>applicationPaths</key>
    <array>
      <string>/System/Library/CoreServices/Finder.app</string>
    </array>
    <key>inputTypeIdentifier</key>
    <string>com.apple.Automator.fileSystemObject</string>
    <key>outputTypeIdentifier</key>
    <string>com.apple.Automator.nothing</string>
    <key>presentationMode</key>
    <integer>15</integer>
    <key>processesInput</key>
    <integer>0</integer>
    <key>serviceApplicationBundleID</key>
    <string>com.apple.finder</string>
    <key>serviceApplicationPath</key>
    <string>/System/Library/CoreServices/Finder.app</string>
    <key>serviceInputTypeIdentifier</key>
    <string>com.apple.Automator.fileSystemObject</string>
    <key>serviceOutputTypeIdentifier</key>
    <string>com.apple.Automator.nothing</string>
    <key>serviceProcessesInput</key>
    <integer>0</integer>
    <key>systemImageName</key>
    <string>NSActionTemplate</string>
    <key>useAutomaticInputType</key>
    <integer>0</integer>
    <key>workflowTypeIdentifier</key>
    <string>com.apple.Automator.servicesMenu</string>
  </dict>
</dict>
</plist>
`;
}

function refreshServices() {
  // Mark the service enabled in the Services preferences (context menu + Services menu),
  // then make the pasteboard server rescan ~/Library/Services so it shows up without a logout.
  const key = `(null) - ${NAME} - runWorkflowAsService`;
  execFile('defaults', ['write', 'pbs', 'NSServicesStatus', '-dict-add', key, '{ enabled_context_menu = 1; enabled_services_menu = 1; presentation_modes = { ContextMenu = 1; ServicesMenu = 1; }; }'], () => {
    execFile('/System/Library/CoreServices/pbs', ['-flush'], () => {
      execFile('/System/Library/CoreServices/pbs', ['-update'], () => {});
    });
  });
}

function isInstalled() {
  return process.platform === 'darwin' && fs.existsSync(path.join(workflowDir(), 'Contents', 'document.wflow'));
}

async function install() {
  if (process.platform !== 'darwin') return false;
  const dir = path.join(workflowDir(), 'Contents');
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, 'Info.plist'), infoPlist(), 'utf8');
  await fs.promises.writeFile(path.join(dir, 'document.wflow'), documentWflow(), 'utf8');
  refreshServices();
  log.info(`quick action installed at ${workflowDir()}`);
  return true;
}

async function uninstall() {
  if (process.platform !== 'darwin') return false;
  await fs.promises.rm(workflowDir(), { recursive: true, force: true });
  refreshServices();
  log.info('quick action removed');
  return true;
}

/** Re-writes the workflow when installed (keeps it current after app updates). */
async function syncIfInstalled() {
  if (!isInstalled()) return false;
  await install();
  return true;
}

module.exports = { install, uninstall, isInstalled, syncIfInstalled, NAME };
