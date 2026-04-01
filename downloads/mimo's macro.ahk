SetBatchLines, -1
SetMouseDelay, -1

f4::Suspend

#If WinActive("ahk_exe RobloxPlayerBeta.exe")

~$LButton::
While GetKeyState("LButton", "P") {
    Click
    Sleep 3
}
Return

Alt::
Send, /{/}{e}{Enter}
Return

#If