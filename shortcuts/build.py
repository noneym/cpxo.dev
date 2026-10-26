#!/usr/bin/env python3
"""Generates the unsigned iOS Shortcut files for cpxo.

Run: python shortcuts/build.py  -> shortcuts/*.shortcut (binary plist)
They are signed on a macOS GitHub Actions runner (`shortcuts sign --mode anyone`)
and attached to the release; see .github/workflows/shortcuts.yml.

Both shortcuts keep the API token in the Shortcuts app folder (iCloud Drive/Shortcuts/cpxo/token.txt):
first run asks for it, later runs read the file.
"""
import plistlib
import uuid
from pathlib import Path

BASE = "https://cpxo.dev"
TOKEN_PATH = "cpxo/token.txt"
# "Shortcuts" = the app's own folder: path-based Get/Save File without a picker.
# "iCloud Drive" would open the Files picker and ignore WFAskWhenRun.
FILE_SERVICE = "Shortcuts"
OUT = Path(__file__).parent


def text(s, attachments=None):
    """A WFTextTokenString. attachments: {position: attachment_dict}; the string must contain
    U+FFFC placeholders at those positions."""
    return {
        "Value": {"string": s, "attachmentsByRange": {f"{{{pos}, 1}}": a for pos, a in (attachments or {}).items()}},
        "WFSerializationType": "WFTextTokenString",
    }


def var(name):
    return {"Type": "Variable", "VariableName": name}


def shortcut_input():
    return {"Type": "ExtensionInput"}


def output(uid, name):
    return {"Type": "ActionOutput", "OutputUUID": uid, "OutputName": name}


def attachment(a):
    return {"Value": a, "WFSerializationType": "WFTextTokenAttachment"}


def action(identifier, **params):
    return {"WFWorkflowActionIdentifier": identifier, "WFWorkflowActionParameters": params}


def headers(pairs):
    items = [
        {"WFItemType": 0, "WFKey": text(k), "WFValue": text(v)}
        for k, v in pairs.items()
    ]
    return {"Value": {"WFDictionaryFieldValueItems": items}, "WFSerializationType": "WFDictionaryFieldValue"}


def token_block():
    """Actions that leave the API token in the variable `token`."""
    get_uid = str(uuid.uuid4()).upper()
    ask_uid = str(uuid.uuid4()).upper()
    group = str(uuid.uuid4()).upper()
    return [
        action(
            "is.workflow.actions.documentpicker.open",
            UUID=get_uid,
            WFFileStorageService=FILE_SERVICE,
            WFGetFilePath=TOKEN_PATH,
            WFShowFilePicker=False,
            WFFileErrorIfNotFound=False,
        ),
        action(
            "is.workflow.actions.conditional",
            GroupingIdentifier=group,
            WFControlFlowMode=0,
            WFCondition=100,  # has any value
            WFInput={"Type": "Variable", "Variable": attachment(output(get_uid, "File"))},
        ),
        action("is.workflow.actions.setvariable", WFVariableName="token", WFInput=attachment(output(get_uid, "File"))),
        action("is.workflow.actions.conditional", GroupingIdentifier=group, WFControlFlowMode=1),
        action(
            "is.workflow.actions.ask",
            UUID=ask_uid,
            WFAskActionPrompt="Paste your cpxo token (from cpxo.dev/dashboard)",
            WFInputType="Text",
            WFAskActionDefaultAnswer="cpx_",
        ),
        action("is.workflow.actions.setvariable", WFVariableName="token", WFInput=attachment(output(ask_uid, "Provided Input"))),
        action(
            "is.workflow.actions.documentpicker.save",
            WFInput=attachment(output(ask_uid, "Provided Input")),
            WFFileStorageService=FILE_SERVICE,
            WFFileDestinationPath=TOKEN_PATH,
            WFAskWhenRun=False,
            WFSaveFileOverwrite=True,
        ),
        action("is.workflow.actions.conditional", GroupingIdentifier=group, WFControlFlowMode=2),
    ]


def api_url(path="/api/clip"):
    s = f"{BASE}{path}?t=￼"
    return text(s, {len(s) - 1: var("token")})


def workflow(actions, glyph, color, accepts_input):
    return {
        "WFWorkflowClientVersion": "2607.0.3",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": color, "WFWorkflowIconGlyphNumber": glyph},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowTypes": ["NCWidget", "WatchKit", "ActionExtension"] if accepts_input else ["NCWidget", "WatchKit"],
        "WFWorkflowInputContentItemClasses": [
            "WFStringContentItem", "WFURLContentItem", "WFImageContentItem", "WFGenericFileContentItem",
            "WFPDFContentItem", "WFAVAssetContentItem", "WFRichTextContentItem",
        ] if accepts_input else [],
        "WFWorkflowHasShortcutInputVariables": accepts_input,
        "WFWorkflowHasOutputFallback": False,
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowActions": actions,
    }


def send_to_windows():
    """Sends the clipboard (or whatever was shared to the Shortcut) to /api/drop.
    Text becomes a clip; a photo or file is uploaded and its link becomes the clip.
    The response (text or link) is copied back to the clipboard."""
    clip_uid = str(uuid.uuid4()).upper()
    dl_uid = str(uuid.uuid4()).upper()
    group = str(uuid.uuid4()).upper()
    actions = token_block() + [
        # payload = Shortcut Input when invoked from the Share Sheet, else the clipboard
        action(
            "is.workflow.actions.conditional",
            GroupingIdentifier=group,
            WFControlFlowMode=0,
            WFCondition=100,
            WFInput={"Type": "Variable", "Variable": attachment(shortcut_input())},
        ),
        action("is.workflow.actions.setvariable", WFVariableName="payload", WFInput=attachment(shortcut_input())),
        action("is.workflow.actions.conditional", GroupingIdentifier=group, WFControlFlowMode=1),
        action("is.workflow.actions.getclipboard", UUID=clip_uid),
        action("is.workflow.actions.setvariable", WFVariableName="payload", WFInput=attachment(output(clip_uid, "Clipboard"))),
        action("is.workflow.actions.conditional", GroupingIdentifier=group, WFControlFlowMode=2),
        # no Content-Type header on purpose: Shortcuts sets it from the payload (text/plain, image/jpeg, ...)
        action(
            "is.workflow.actions.downloadurl",
            UUID=dl_uid,
            WFURL=api_url("/api/drop"),
            WFHTTPMethod="POST",
            WFHTTPBodyType="File",
            WFRequestVariable=attachment(var("payload")),
            ShowHeaders=True,
            WFHTTPHeaders=headers({"X-Source": "ios"}),
        ),
        action("is.workflow.actions.setclipboard", WFInput=attachment(output(dl_uid, "Contents of URL"))),
        action(
            "is.workflow.actions.notification",
            WFNotificationActionTitle="cpxo",
            WFNotificationActionBody=text("Sent: ￼", {6: output(dl_uid, "Contents of URL")}),
            WFNotificationActionSound=False,
        ),
    ]
    return workflow(actions, glyph=59511, color=4292093695, accepts_input=True)


def get_from_windows():
    dl_uid = str(uuid.uuid4()).upper()
    actions = token_block() + [
        action("is.workflow.actions.downloadurl", UUID=dl_uid, WFURL=api_url(), WFHTTPMethod="GET"),
        action("is.workflow.actions.setclipboard", WFInput=attachment(output(dl_uid, "Contents of URL"))),
        action(
            "is.workflow.actions.notification",
            WFNotificationActionTitle="cpxo",
            WFNotificationActionBody=text("Copied: ￼", {8: output(dl_uid, "Contents of URL")}),
            WFNotificationActionSound=False,
        ),
    ]
    return workflow(actions, glyph=59511, color=4292093695, accepts_input=False)


if __name__ == "__main__":
    for name, wf in {"cpxo-send-to-windows": send_to_windows(), "cpxo-get-from-windows": get_from_windows()}.items():
        path = OUT / f"{name}.shortcut"
        with open(path, "wb") as f:
            plistlib.dump(wf, f, fmt=plistlib.FMT_BINARY)
        print("wrote", path)
