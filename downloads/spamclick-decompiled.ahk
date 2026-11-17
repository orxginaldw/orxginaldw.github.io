; <COMPILER: v1.1.34.03>
SetBatchLines, -1
Menu, Tray, NoStandard
Menu, Tray, Add, Exit, GuiClose
Menu, Tray, Default, Exit
InputBox, uName, User`?, Enter User: 1
If uName = 1
InputBox, uPass, Pass`?, Enter your PASSWORD!, HIDE
Else
{
Msgbox, 48, LOL, Wrong guess`, Stupid Bitch!
Goto, GuiClose
}
If uPass = 1
Goto, EnterScript
Else
Msgbox, 48, LOL, U fucking suck!
GuiClose:
ExitApp
Return
EnterScript:
SetMouseDelay, -1
f3::suspend
#If WinActive("ahk_exe RobloxPlayerBeta.exe")
~$LButton::
While GetkeyState("LButton", "P"){
Click
Sleep 3
}
Return
return