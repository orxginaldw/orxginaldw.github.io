#Requires AutoHotkey v1.1+

; ===========================
; Roblox-only hotkeys
; ===========================
#If WinActive("ahk_exe RobloxPlayerBeta.exe") || WinActive("ahk_exe RobloxStudioBeta.exe")

; ---- Toggle (F8) ----
isEnabled := true
F8::
    isEnabled := !isEnabled
    ToolTip, % isEnabled ? "🔵 Macros Enabled" : "🔴 Macros Disabled"
    SetTimer, __HideTip, -900
return
__HideTip:
    ToolTip
return

; ---- Z: while held, send -, ., Enter repeatedly ----
macroRunning := false

$*z::                              ; Z down
if (!isEnabled || macroRunning)
    return
macroRunning := true
SetTimer, __MacroLoop, 10
return

$*z up::                           ; Z up
macroRunning := false
SetTimer, __MacroLoop, Off
return

__MacroLoop:
if (!macroRunning || !isEnabled)
    return
Send, -
Sleep, 30
Send, .
Sleep, 30
Send, {Enter}
Sleep, 50
return

; ---- F: hold RMB once while F is held ----
fActive := false

$*f::
if (!isEnabled) {
    Send, {Blind}{f}
    return
}
if (!fActive) {
    fActive := true
    Send, {RButton down}
    Send, {Blind}{f down}
}
return

$*f up::
if (fActive) {
    Send, {Blind}{f up}
    Send, {RButton up}
    fActive := false
} else {
    Send, {Blind}{f up}
}
return

#If