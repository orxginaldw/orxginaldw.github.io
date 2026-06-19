#Requires AutoHotkey v2.0
#SingleInstance Force
#Warn
Persistent

SetWorkingDir(A_ScriptDir)
SendMode("Input")
SetTitleMatchMode(2)

; Cage Macro - Deepwoken helper
; Home reloads the script. Esc exits it.

global INI_FILE := A_ScriptDir "\config.ini"
global IMAGE_FILE := A_ScriptDir "\1023583821573721994.jpg"
global ROBLOX_EXE := "ahk_exe RobloxPlayerBeta.exe"
global M1_FAILSAFE_MS := 12000
global SPRINT_M1_INTERVAL_MS := 420
global COMMAND_BURST_DELAY_MS := 35

; --- NETWORK CONFIGURATION ---
global GLOBAL_DB_URL := "https://665ecc09ded9707b05b22b7a.mockapi.io/api/v1/pings/1" ; Replace with your database endpoint
global LAST_KNOWN_PING_TIME := 0

global Theme := {
    Bg: "101114",
    Panel: "1B1D23",
    Panel2: "242833",
    Text: "F4F7FB",
    Muted: "A7ADBB",
    Accent: "4FC3F7",
    Red: "D91F32",
    RedDark: "5C1018",
    Good: "56D364",
    Warn: "F2CC60",
    Bad: "F85149"
}

global Cfg := LoadConfig()
global State := {
    Busy: false,
    LastParry: 0,
    LastSpace: 0,
    LastQ: 0,
    ParryCooldownMs: 1200
}

global MoveData := Map(
    "Ankle Cutter", { Cooldown: 5.0, Windup: 0.5, Last: 0 },
    "Mayhem", { Cooldown: 15.0, Windup: 0.6, Last: 0 },
    "Relentless Hunt", { Cooldown: 20.0, Windup: 0.8, Last: 0 },
    "Rising Star", { Cooldown: 14.0, Windup: 0.5, Last: 0 }
)

global Ui := {
    Hud: "",
    Menu: "",
    Settings: "",
    Notes: "",
    Builder: "",
    Checklist: "",
    Gank: "",
    Parry: "",
    ParryBar: "",
    ParryStatus: "",
    MoveLabels: Map(),
    MenuControls: Map()
}

BuildHud()
BuildParryOverlay()
ConfigureDynamicHotkeys()
SetTimer(UpdateHud, 100)
SetTimer(ListenForTeamPings, 3000) ; Start listening for team pings every 3 seconds
OnMessage(0x0201, DragWindow)

; ---------------------------------------------------------------------------
; Configuration
; ---------------------------------------------------------------------------

LoadConfig() {
    return {
        Webhook: IniRead(INI_FILE, "Settings", "Webhook", ""),
        RoleId: IniRead(INI_FILE, "Settings", "RoleID", ""),
        Extended: ReadBool("Settings", "Extended", false),
        Silentheart: ReadBool("Settings", "Silentheart", true),
        AutoUppercut: ReadBool("Combat", "AutoUppercut", false),
        FastFeint: ReadBool("Combat", "FastFeint", false),
        ParryBar: ReadBool("Combat", "ParryBar", false),
        M1Repeat: ReadBool("Combat", "M1Repeat", false),
        SprintM1: ReadBool("Combat", "SprintM1", false),
        SprintKey: NormalizeKeyName(IniRead(INI_FILE, "Combat", "SprintKey", "Shift")),
        MballMacro: ReadBool("Combat", "MballMacro", false),
        MballKey: NormalizeKeyName(IniRead(INI_FILE, "Combat", "MballKey", "F6")),
        DashBang: ReadBool("Combat", "DashBang", false),
        RitualCast: ReadBool("Combat", "RitualCast", false),
        RitualKey: NormalizeKeyName(IniRead(INI_FILE, "Combat", "RitualKey", "F8")),
        RitualSequence: IniRead(INI_FILE, "Combat", "RitualSequence", ""),
        RollParry: ReadBool("Combat", "RollParry", false),
        GoldenTongue: ReadBool("Combat", "GoldenTongue", false),
        GoldenKey: NormalizeKeyName(IniRead(INI_FILE, "Combat", "GoldenKey", "F7")),
        Notes: IniRead(INI_FILE, "User", "Notes", ""),
        BuildId: IniRead(INI_FILE, "Settings", "BuildID", "")
    }
}

ReadBool(section, key, fallback) {
    value := IniRead(INI_FILE, section, key, fallback ? "1" : "0")
    return value = "1" || StrLower(value) = "true" || StrLower(value) = "yes"
}

ReadFloat(section, key, fallback, min, max) {
    raw := IniRead(INI_FILE, section, key, fallback)
    value := IsNumber(raw) ? Float(raw) : fallback
    return Clamp(value, min, max)
}

ReadInt(section, key, fallback, min, max) {
    raw := IniRead(INI_FILE, section, key, fallback)
    value := IsIntegerText(raw) ? Integer(raw) : fallback
    return Clamp(value, min, max)
}

IsIntegerText(value) {
    return RegExMatch(value, "^-?\d+$")
}

Clamp(value, min, max) {
    if value < min
        return min
    if value > max
        return max
    return value
}

BoolText(value) {
    return value ? "1" : "0"
}

SaveCoreSettings() {
    IniWrite(BoolText(Cfg.Extended), INI_FILE, "Settings", "Extended")
    IniWrite(BoolText(Cfg.Silentheart), INI_FILE, "Settings", "Silentheart")
    IniWrite(Cfg.Webhook, INI_FILE, "Settings", "Webhook")
    IniWrite(Cfg.RoleId, INI_FILE, "Settings", "RoleID")
}

SaveCombatSettings() {
    IniWrite(BoolText(Cfg.AutoUppercut), INI_FILE, "Combat", "AutoUppercut")
    IniWrite(BoolText(Cfg.FastFeint), INI_FILE, "Combat", "FastFeint")
    IniWrite(BoolText(Cfg.ParryBar), INI_FILE, "Combat", "ParryBar")
    IniWrite(BoolText(Cfg.M1Repeat), INI_FILE, "Combat", "M1Repeat")
    IniWrite(BoolText(Cfg.SprintM1), INI_FILE, "Combat", "SprintM1")
    IniWrite(Cfg.SprintKey, INI_FILE, "Combat", "SprintKey")
    IniWrite(BoolText(Cfg.MballMacro), INI_FILE, "Combat", "MballMacro")
    IniWrite(Cfg.MballKey, INI_FILE, "Combat", "MballKey")
    IniWrite(BoolText(Cfg.DashBang), INI_FILE, "Combat", "DashBang")
    IniWrite(BoolText(Cfg.RitualCast), INI_FILE, "Combat", "RitualCast")
    IniWrite(Cfg.RitualKey, INI_FILE, "Combat", "RitualKey")
    IniWrite(Cfg.RitualSequence, INI_FILE, "Combat", "RitualSequence")
    IniWrite(BoolText(Cfg.RollParry), INI_FILE, "Combat", "RollParry")
    IniWrite(BoolText(Cfg.GoldenTongue), INI_FILE, "Combat", "GoldenTongue")
    IniWrite(Cfg.GoldenKey, INI_FILE, "Combat", "GoldenKey")
}

; ---------------------------------------------------------------------------
; HUD
; ---------------------------------------------------------------------------

BuildHud() {
    global Ui

    hadPos := false
    if Ui.Hud != "" {
        try {
            Ui.Hud.GetPos(&oldX, &oldY)
            hadPos := true
        }
    }

    DestroyGui("Hud")
    Ui.MoveLabels := Map()

    hud := Gui("+AlwaysOnTop -Caption +ToolWindow +Border", "Cage Macro")
    hud.BackColor := Theme.Bg
    hud.MarginX := 12
    hud.MarginY := 10
    Ui.Hud := hud

    hud.SetFont("s11 w800 c" Theme.Text, "Segoe UI")
    hud.AddText("x12 y10 w150 h22", "Cage Macro")
    hud.SetFont("s8 c" Theme.Muted, "Segoe UI")
    hud.AddText("x12 y32 w150 h18", "Deepwoken helper")

    if FileExist(IMAGE_FILE)
        hud.AddPicture("x190 y10 w76 h76", IMAGE_FILE)

    y := 96

    if Cfg.Silentheart {
        hud.SetFont("s8 w600 c" Theme.Accent, "Segoe UI")
        hud.AddText("x12 y" y " w170 h18", "Silentheart")
        y += 22

        hud.SetFont("s8 c" Theme.Text, "Segoe UI")
        for name, data in MoveData {
            Ui.MoveLabels[name] := hud.AddText("x12 y" y " w180 h18", name)
            y += 20
        }
        y += 6
    }

    hud.SetFont("s8 w600 c" Theme.Text, "Segoe UI")
    hud.AddButton("x12 y" y " w86 h28", "Combat").OnEvent("Click", ToggleMenu)
    hud.AddButton("x104 y" y " w86 h28", "Gank Ping").OnEvent("Click", OpenGankPing)
    hud.AddButton("x196 y" y " w70 h28", "Builder").OnEvent("Click", OpenBuilder)
    y += 34
    hud.AddButton("x12 y" y " w86 h28", "Notes").OnEvent("Click", OpenNotes)
    hud.AddButton("x104 y" y " w86 h28", "Setup").OnEvent("Click", OpenSettings)
    hud.AddButton("x196 y" y " w70 h28", "Discord").OnEvent("Click", (*) => Run("https://discord.gg/KYyxc8eVPa"))
    y += 36

    hud.SetFont("s7 c" Theme.Muted, "Segoe UI")
    hud.AddText("x12 y" y " w258 h16 Center", "Home: reload    Esc: exit")
    y += 22

    showOpts := "w278 h" y " NoActivate"
    if hadPos
        showOpts := "x" oldX " y" oldY " " showOpts
    hud.Show(showOpts)
}

AddHudStatus(targetGui, label, enabled, y) {
    color := enabled ? Theme.Good : Theme.Muted
    targetGui.SetFont("s8 c" color, "Segoe UI")
    targetGui.AddText("x22 y" y " w14 h18", enabled ? "ON" : "--")
    targetGui.SetFont("s8 c" Theme.Text, "Segoe UI")
    targetGui.AddText("x48 y" y " w120 h18", label)
}

UpdateHud() {
    if !Cfg.Silentheart || Ui.Hud = ""
        return

    now := A_TickCount / 1000
    for name, data in MoveData {
        if !Ui.MoveLabels.Has(name)
            continue

        remaining := (data.Cooldown + data.Windup) - (now - data.Last)
        label := Ui.MoveLabels[name]
        if data.Last > 0 && remaining > 0 {
            label.Opt("c" Theme.Warn)
            label.Text := name ": " Round(remaining, 1) "s"
        } else {
            label.Opt("c" Theme.Text)
            label.Text := name
        }
    }
}

DragWindow(wParam, lParam, msg, hwnd) {
    ; Lets the captionless HUD/menu/parry overlay be dragged by clicking anywhere on them.
    if ((Ui.Hud != "" && hwnd == Ui.Hud.Hwnd)
        || (Ui.Menu != "" && hwnd == Ui.Menu.Hwnd)
        || (Ui.Parry != "" && hwnd == Ui.Parry.Hwnd)) {
        DllCall("ReleaseCapture")
        PostMessage(0xA1, 2, 0, , "ahk_id " hwnd)
    }
}

DestroyGui(name) {
    if Ui.HasOwnProp(name) && Ui.%name% != "" {
        try Ui.%name%.Destroy()
        Ui.%name% := ""
    }
}

; ---------------------------------------------------------------------------
; Combat menu
; ---------------------------------------------------------------------------

ToggleMenu(*) {
    if Ui.Menu != "" {
        DestroyGui("Menu")
        return
    }
    BuildCombatMenu()
}

BuildCombatMenu() {
    global Ui

    DestroyGui("Menu")
    Ui.MenuControls := Map()

    combatGui := Gui("+AlwaysOnTop -Caption +ToolWindow +Border", "Combat")
    combatGui.BackColor := "08090B"
    Ui.Menu := combatGui

    combatGui.SetFont("s12 w900 c" Theme.Text, "Segoe UI")
    combatGui.AddText("x18 y12 w250 h24", "COMBAT MACROS")
    combatGui.SetFont("s8 w700 c" Theme.Red, "Segoe UI")
    combatGui.AddText("x18 y38 w380 h18", "DEEPWOKEN MACRO CONTROL")
    combatGui.AddText("x18 y60 w394 h2 Background" Theme.Red)

    combatGui.SetFont("s8 c" Theme.Text, "Segoe UI")
    macroList := combatGui.AddListView("x18 y76 w394 h170 Background" Theme.Panel " c" Theme.Text " Checked -Multi", ["Macro", "Function"])
    macroList.ModifyCol(1, 132)
    macroList.ModifyCol(2, 236)
    AddMacroRow(macroList, "M1Repeat", "M1 Repeat", "Hold LButton to repeat M1.", Cfg.M1Repeat)
    AddMacroRow(macroList, "SprintM1", "Sprint M1", "Fixed sprint-click rhythm.", Cfg.SprintM1)
    AddMacroRow(macroList, "AutoUppercut", "Auto Uppercut", "Ctrl into quick M1 tap.", Cfg.AutoUppercut)
    AddMacroRow(macroList, "FastFeint", "Fast Feint", "F feint timing helper.", Cfg.FastFeint)
    AddMacroRow(macroList, "ParryBar", "Parry Bar", "Themed recovery overlay.", Cfg.ParryBar)
    AddMacroRow(macroList, "MballMacro", "Mb all", "Keybind opens - chat and sends mb all.", Cfg.MballMacro)
    AddMacroRow(macroList, "DashBang", "Auto ! After -", "Adds ! after pressing -.", Cfg.DashBang)
    AddMacroRow(macroList, "RitualCast", "Ritual Cast", "Plays saved wisp sequence.", Cfg.RitualCast)
    AddMacroRow(macroList, "RollParry", "Roll Parry", "F quickly taps Q after parry.", Cfg.RollParry)
    AddMacroRow(macroList, "GoldenTongue", "Golden Tongue", "Keybind sends . in chat.", Cfg.GoldenTongue)
    Ui.MenuControls["MacroList"] := macroList

    combatGui.AddText("x18 y260 w394 h1 Background" Theme.RedDark)
    combatGui.SetFont("s8 w700 c" Theme.Muted, "Segoe UI")
    combatGui.AddText("x18 y274 w170 h18", "SPRINT KEY")
    Ui.MenuControls["SprintKey"] := combatGui.AddEdit("x18 y294 w170 h26 Background" Theme.Panel " c" Theme.Text " Center", Cfg.SprintKey)

    combatGui.AddText("x224 y274 w170 h18", "-MB ALL KEY")
    Ui.MenuControls["MballKey"] := combatGui.AddEdit("x224 y294 w170 h26 Background" Theme.Panel " c" Theme.Text " Center", Cfg.MballKey)

    combatGui.AddText("x18 y326 w170 h18", "RITUAL KEY")
    Ui.MenuControls["RitualKey"] := combatGui.AddEdit("x18 y346 w170 h24 Background" Theme.Panel " c" Theme.Text " Center", Cfg.RitualKey)

    combatGui.AddText("x224 y326 w170 h18", "GOLDEN KEY")
    Ui.MenuControls["GoldenKey"] := combatGui.AddEdit("x224 y346 w170 h24 Background" Theme.Panel " c" Theme.Text " Center", Cfg.GoldenKey)

    combatGui.AddText("x18 y378 w170 h18", "WISP SEQUENCE")
    Ui.MenuControls["RitualSequence"] := combatGui.AddEdit("x18 y398 w376 h24 Background" Theme.Panel " c" Theme.Text, Cfg.RitualSequence)

    combatGui.SetFont("s7 c" Theme.Muted, "Segoe UI")
    combatGui.AddText("x18 y432 w380 h16", "Ritual sequence accepts keys separated by spaces, commas, or typed together.")

    combatGui.SetFont("s8 w700 c" Theme.Text, "Segoe UI")
    combatGui.AddButton("x224 y458 w88 h30 Default", "SAVE").OnEvent("Click", SaveCombatPanel)
    combatGui.AddButton("x318 y458 w76 h30", "CLOSE").OnEvent("Click", ToggleMenu)

    x := 40, y := 80
    if Ui.Hud != "" {
        Ui.Hud.GetPos(&hx, &hy, &hw, &hh)
        x := hx
        y := hy + hh + 6
    }
    combatGui.Show("x" x " y" y " w432 h506 NoActivate")
}

AddMacroRow(listView, key, title, detail, enabled) {
    row := listView.Add("", title, detail)
    if enabled
        listView.Modify(row, "Check")
    Ui.MenuControls[key "_Row"] := row
}

IsMacroChecked(key) {
    listView := Ui.MenuControls["MacroList"]
    return listView.GetNext(Ui.MenuControls[key "_Row"] - 1, "C") = Ui.MenuControls[key "_Row"]
}

SaveCombatPanel(*) {
    Cfg.AutoUppercut := IsMacroChecked("AutoUppercut")
    Cfg.FastFeint := IsMacroChecked("FastFeint")
    Cfg.ParryBar := IsMacroChecked("ParryBar")
    Cfg.M1Repeat := IsMacroChecked("M1Repeat")
    Cfg.SprintM1 := IsMacroChecked("SprintM1")
    Cfg.SprintKey := NormalizeKeyName(Ui.MenuControls["SprintKey"].Value)
    Cfg.MballMacro := IsMacroChecked("MballMacro")
    Cfg.MballKey := NormalizeKeyName(Ui.MenuControls["MballKey"].Value)
    Cfg.DashBang := IsMacroChecked("DashBang")
    Cfg.RitualCast := IsMacroChecked("RitualCast")
    Cfg.RitualKey := NormalizeKeyName(Ui.MenuControls["RitualKey"].Value)
    Cfg.RitualSequence := Trim(Ui.MenuControls["RitualSequence"].Value)
    Cfg.RollParry := IsMacroChecked("RollParry")
    Cfg.GoldenTongue := IsMacroChecked("GoldenTongue")
    Cfg.GoldenKey := NormalizeKeyName(Ui.MenuControls["GoldenKey"].Value)

    SaveCombatSettings()
    ConfigureDynamicHotkeys()
    BuildParryOverlay()
    BuildHud()
    FlashTip("Combat settings saved.")
}

NormalizeKeyName(value) {
    value := Trim(value)
    if value = ""
        return "Shift"

    if StrLen(value) = 1
        return value

    normalized := StrLower(value)
    aliases := Map(
        "shift", "Shift",
        "lshift", "LShift",
        "rshift", "RShift",
        "ctrl", "Ctrl",
        "control", "Ctrl",
        "lctrl", "LCtrl",
        "rctrl", "RCtrl",
        "alt", "Alt",
        "space", "Space",
        "tab", "Tab",
        "capslock", "CapsLock",
        "up", "Up",
        "down", "Down",
        "left", "Left",
        "right", "Right"
    )

    if aliases.Has(normalized)
        return aliases[normalized]

    if RegExMatch(value, "i)^(F([1-9]|1[0-9]|2[0-4])|[A-Z0-9]|XButton[12]|MButton|LButton|RButton|Numpad\d|Numpad(Add|Sub|Mult|Div|Dot|Enter)|Insert|Delete|Home|End|PgUp|PgDn|Backspace|Enter|Escape|Esc)$")
        return value

    return value
}

; ---------------------------------------------------------------------------
; Settings, notes, and builder
; ---------------------------------------------------------------------------

OpenSettings(*) {
    DestroyGui("Settings")

    settings := Gui("+AlwaysOnTop +ToolWindow", "Cage Macro Setup")
    settings.BackColor := Theme.Bg
    Ui.Settings := settings

    settings.SetFont("s11 w700 c" Theme.Text, "Segoe UI")
    settings.AddText("x16 y14 w320 h24", "Setup")

    settings.SetFont("s9 c" Theme.Text, "Segoe UI")
    ext := settings.AddCheckbox("x18 y52 w280 h22 Checked" BoolText(Cfg.Extended), "Show extended tools")
    silent := settings.AddCheckbox("x18 y82 w280 h22 Checked" BoolText(Cfg.Silentheart), "Show Silentheart tracker")

    settings.SetFont("s8 c" Theme.Muted, "Segoe UI")
    settings.AddText("x18 y122 w320 h18", "Discord webhook")
    hook := settings.AddEdit("x18 y142 w360 h24 Background" Theme.Panel " c" Theme.Text, Cfg.Webhook)

    settings.AddText("x18 y178 w320 h18", "Role or mention text")
    role := settings.AddEdit("x18 y198 w360 h24 Background" Theme.Panel " c" Theme.Text, Cfg.RoleId)

    settings.SetFont("s8 w600 c" Theme.Text, "Segoe UI")
    settings.AddButton("x18 y242 w104 h30 Default", "Save").OnEvent("Click", SaveSettingsPanel.Bind(ext, silent, hook, role))
    settings.AddButton("x130 y242 w104 h30", "Close").OnEvent("Click", (*) => DestroyGui("Settings"))
    settings.Show("w396 h292")
}

SaveSettingsPanel(ext, silent, hook, role, *) {
    Cfg.Extended := ext.Value = 1
    Cfg.Silentheart := silent.Value = 1
    Cfg.Webhook := Trim(hook.Value)
    Cfg.RoleId := Trim(role.Value)

    SaveCoreSettings()
    BuildHud()
    FlashTip("Setup saved.")
    DestroyGui("Settings")
}

OpenNotes(*) {
    DestroyGui("Notes")

    notes := Gui("+AlwaysOnTop +ToolWindow +Resize", "Macro Notes")
    notes.BackColor := Theme.Bg
    Ui.Notes := notes

    notes.SetFont("s10 w700 c" Theme.Text, "Segoe UI")
    notes.AddText("x14 y12 w320 h22", "Notes")
    box := notes.AddEdit("x14 y42 w360 h220 Background" Theme.Panel " c" Theme.Text " WantTab", Cfg.Notes)
    notes.SetFont("s8 w600 c" Theme.Text, "Segoe UI")
    notes.AddButton("x14 y272 w100 h30 Default", "Save").OnEvent("Click", SaveNotes.Bind(box))
    notes.AddButton("x120 y272 w100 h30", "Close").OnEvent("Click", (*) => DestroyGui("Notes"))
    notes.Show("w390 h318")
}

SaveNotes(box, *) {
    Cfg.Notes := box.Value
    IniWrite(Cfg.Notes, INI_FILE, "User", "Notes")
    FlashTip("Notes saved.")
}

OpenBuilder(*) {
    DestroyGui("Builder")

    builder := Gui("+AlwaysOnTop +ToolWindow", "Build Checklist")
    builder.BackColor := Theme.Bg
    Ui.Builder := builder

    builder.SetFont("s10 w700 c" Theme.Text, "Segoe UI")
    builder.AddText("x16 y14 w300 h22", "Build checklist")
    builder.SetFont("s8 c" Theme.Muted, "Segoe UI")
    builder.AddText("x16 y42 w360 h18", "Paste a link from https://deepwoken.co/builder.")
    link := builder.AddEdit("x16 y68 w360 h24 Background" Theme.Panel " c" Theme.Text, Cfg.BuildId)
    builder.SetFont("s8 w600 c" Theme.Text, "Segoe UI")
    builder.AddButton("x16 y108 w112 h30 Default", "Fetch").OnEvent("Click", FetchBuildChecklist.Bind(link))
    builder.AddButton("x134 y108 w112 h30", "Close").OnEvent("Click", (*) => DestroyGui("Builder"))
    builder.Show("w392 h156")
}

FetchBuildChecklist(link, *) {
    url := Trim(link.Value)
    if !(InStr(url, "deepwoken.co") || InStr(url, "deepwoken.wiki")) {
        MsgBox("Use a deepwoken.co or deepwoken.wiki link.")
        return
    }

    IniWrite(url, INI_FILE, "Settings", "BuildID")
    Cfg.BuildId := url
    FlashTip("Fetching build data...")

    html := ""
    try {
        req := ComObject("WinHttp.WinHttpRequest.5.1")
        req.Open("GET", url, false)
        req.SetRequestHeader("User-Agent", "Mozilla/5.0")
        req.Send()
        html := req.ResponseText
    } catch as err {
        MsgBox("Could not fetch that link.`n`n" err.Message)
        return
    }

    items := ExtractChecklistItems(html)
    if items.Length = 0 {
        MsgBox("I could not find checklist items on that page.")
        return
    }
    ShowChecklist(items)
}

ExtractChecklistItems(html) {
    items := []
    seen := Map()

    patterns := [
        '"(?:name|talent|talentName|displayName)"\s*:\s*"([^"]{3,70})"',
        '"(?:Strength|Fortitude|Agility|Intelligence|Willpower|Charisma|Heavy|Medium|Light|Weapon|Flamecharm|Frostdraw|Thundercall|Galebreathe|Shadowcast|Ironsing|Bloodrend)"\s*:\s*(\d{1,3})',
        '"(?:attribute|stat)"\s*:\s*"([^"]{3,30})"[^{}]{0,120}?"(?:value|points)"\s*:\s*(\d{1,3})'
    ]

    for pattern in patterns {
        offset := 1
        while (offset := RegExMatch(html, pattern, &match, offset + 1)) {
            if match.Count >= 2 && IsNumber(match[2])
                value := CleanJsonText(match[1]) ": " match[2]
            else
                value := CleanJsonText(match[1])
            if IsChecklistNoise(value)
                continue
            if !seen.Has(value) {
                seen[value] := true
                items.Push(value)
            }
            if items.Length >= 80
                break
        }
    }

    text := HtmlToText(html)
    AddRenderedBuilderStats(text, items, seen)
    AddRenderedBuilderTalents(text, items, seen)

    return items
}

HtmlToText(html) {
    text := RegExReplace(html, "is)<script.*?</script>", "`n")
    text := RegExReplace(text, "is)<style.*?</style>", "`n")
    text := RegExReplace(text, "i)<(br|p|div|li|tr|h[1-6]|button|input|select)[^>]*>", "`n")
    text := RegExReplace(text, "<[^>]+>", " ")
    text := StrReplace(text, "&nbsp;", " ")
    text := StrReplace(text, "&amp;", "&")
    text := StrReplace(text, "&quot;", '"')
    text := StrReplace(text, "&#39;", "'")
    text := RegExReplace(text, "[ `t]+", " ")
    text := RegExReplace(text, "(\R\s*)+", "`n")
    return Trim(text)
}

AddRenderedBuilderStats(text, items, seen) {
    stats := [
        ["Strength", "STR"], ["Fortitude", "FTD"], ["Agility", "AGI"],
        ["Intelligence", "INT"], ["Willpower", "WLL"], ["Charisma", "CHA"],
        ["Heavy Wep.", "HVY"], ["Medium Wep.", "MED"], ["Light Wep.", "LHT"],
        ["Flamecharm", "FLM"], ["Frostdraw", "ICE"], ["Thundercall", "LTN"],
        ["Galebreathe", "WND"], ["Shadowcast", "SDW"], ["Ironsing", "MTL"],
        ["Bloodrend", "BLD"]
    ]

    for stat in stats {
        label := stat[1]
        code := stat[2]
        pattern := "is)" RegExEscape(label) "\s*" RegExEscape(code) "\s*(\d{1,3})"
        if RegExMatch(text, pattern, &match)
            AddChecklistItem(items, seen, "Stat - " label ": " match[1])
    }
}

AddRenderedBuilderTalents(text, items, seen) {
    start := InStr(text, "Obtainable Talents")
    if !start
        return

    stop := InStr(text, "Resources", , start)
    if !stop
        stop := InStr(text, "Mantras", , start)
    if !stop
        stop := Min(StrLen(text), start + 6000)

    block := SubStr(text, start, stop - start)
    skip := Map(
        "Obtainable Talents", true, "Search", true, "Filters", true, "Advanced", true,
        "Image", true, "Only obtainable thanks to Shrine of Mastery", true
    )

    for line in StrSplit(block, "`n") {
        value := Trim(RegExReplace(line, "\s*↗.*$"))
        value := RegExReplace(value, "^\d+\s*", "")
        if StrLen(value) < 3 || skip.Has(value) || RegExMatch(value, "i)^(try |Base |Import |Deepwoken Builder)")
            continue
        if RegExMatch(value, "^[A-Z][A-Za-z' -]{2,45}$")
            textTalent := "Talent - " value
            AddChecklistItem(items, seen, textTalent)
        if items.Length >= 140
            break
    }
}

AddChecklistItem(items, seen, value) {
    value := Trim(value)
    if value = "" || seen.Has(value)
        return
    seen[value] := true
    items.Push(value)
}

RegExEscape(value) {
    return RegExReplace(value, "([\\\.\*\?\+\[\{\|\(\)\^\$])", "\$1")
}

CleanJsonText(value) {
    value := StrReplace(value, "\u0026", "&")
    value := StrReplace(value, '\"', '"')
    value := StrReplace(value, "\/", "/")
    return Trim(value)
}

IsChecklistNoise(value) {
    return value = "" || RegExMatch(value, "i)^(true|false|null|undefined|\d+)$")
}

ShowChecklist(items) {
    DestroyGui("Checklist")

    listGui := Gui("+AlwaysOnTop +ToolWindow +Resize", "Build Checklist")
    listGui.BackColor := Theme.Bg
    Ui.Checklist := listGui

    listGui.SetFont("s10 w700 c" Theme.Text, "Segoe UI")
    listGui.AddText("x14 y12 w360 h22", "Build checklist")

    listGui.SetFont("s8 c" Theme.Text, "Segoe UI")
    checklist := listGui.AddListView("x14 y44 w470 h420 Background" Theme.Panel " c" Theme.Text " Checked -Multi", ["Progress item"])
    checklist.ModifyCol(1, 442)
    for item in items
        checklist.Add("", item)

    listGui.SetFont("s8 w600 c" Theme.Text, "Segoe UI")
    listGui.AddButton("x14 y476 w110 h28", "Close").OnEvent("Click", (*) => DestroyGui("Checklist"))
    listGui.Show("x50 y50 w500 h520 NoActivate")
}

; ---------------------------------------------------------------------------
; Parry overlay
; ---------------------------------------------------------------------------

BuildParryOverlay() {
    if !Cfg.ParryBar {
        SetTimer(UpdateParryBar, 0)
        DestroyGui("Parry")
        return
    }

    if Ui.Parry != ""
        return

    width := 210
    x := Round((A_ScreenWidth - width) / 2)
    y := Round((A_ScreenHeight / 2) - 130)

    ; Moveable + transparent overlay.
    ; Removed +E0x20 because that made it click-through and impossible to drag.
    parry := Gui("+AlwaysOnTop -Caption +ToolWindow +Border", "Parry Recovery")
    parry.BackColor := "08090B"
    Ui.Parry := parry

    parry.AddText("x0 y0 w" width " h2 Background" Theme.Good)
    parry.SetFont("s7 w900 c" Theme.Text, "Segoe UI")
    parry.AddText("x10 y7 w120 h14", "PARRY RECOVERY")
    parry.SetFont("s7 w700 c" Theme.Good, "Segoe UI")
    Ui.ParryStatus := parry.AddText("x126 y7 w74 h14 Right", "READY")
    parry.AddText("x10 y25 w190 h1 Background" Theme.RedDark)
    Ui.ParryBar := parry.AddProgress("x10 y31 w190 h7 c" Theme.Good " Background" Theme.Panel2 " Range0-100", 100)
    parry.Show("x" x " y" y " w" width " h48 NoActivate")

    ; 0 = invisible, 255 = fully opaque. 185 is transparent but readable.
    try WinSetTransparent(185, "ahk_id " parry.Hwnd)
}
TryStartParryTimer() {
    ; Returns false while parry is still on cooldown.
    now := A_TickCount
    if State.LastParry > 0 && (now - State.LastParry) < State.ParryCooldownMs
        return false

    State.LastParry := now

    if Cfg.ParryBar {
        BuildParryOverlay()

        if Ui.ParryBar != "" {
            Ui.ParryBar.Opt("c" Theme.Red)
            Ui.ParryBar.Value := 100
        }

        if Ui.ParryStatus != "" {
            Ui.ParryStatus.Opt("c" Theme.Red)
            Ui.ParryStatus.Text := "1.20s"
        }

        SetTimer(UpdateParryBar, 10)
    }

    return true
}

StartParryTimer() {
    return TryStartParryTimer()
}

UpdateParryBar() {
    if !Cfg.ParryBar || Ui.ParryBar = "" {
        SetTimer(UpdateParryBar, 0)
        return
    }

    elapsed := A_TickCount - State.LastParry
    remaining := State.ParryCooldownMs - elapsed

    if remaining <= 0 {
        Ui.ParryBar.Opt("c" Theme.Good)
        Ui.ParryBar.Value := 100

        if Ui.ParryStatus != "" {
            Ui.ParryStatus.Opt("c" Theme.Good)
            Ui.ParryStatus.Text := "READY"
        }

        SetTimer(UpdateParryBar, 0)
        return
    }

    Ui.ParryBar.Opt("c" Theme.Red)
    Ui.ParryBar.Value := 100 - Round((elapsed / State.ParryCooldownMs) * 100)

    if Ui.ParryStatus != "" {
        Ui.ParryStatus.Opt("c" Theme.Red)
        Ui.ParryStatus.Text := Format("{:.2f}s", remaining / 1000)
    }
}

; ---------------------------------------------------------------------------
; Chat macros
; ---------------------------------------------------------------------------

ConfigureDynamicHotkeys() {
    static lastMballKey := ""
    static lastRitualKey := ""
    static lastGoldenKey := ""

    if lastMballKey != "" {
        try Hotkey("*" lastMballKey, SendMballCommand, "Off")
    }
    if lastRitualKey != "" {
        try Hotkey("*" lastRitualKey, RunRitualCast, "Off")
    }
    if lastGoldenKey != "" {
        try Hotkey("*" lastGoldenKey, SendGoldenTongue, "Off")
    }

    lastMballKey := Cfg.MballKey
    try Hotkey("*" Cfg.MballKey, SendMballCommand, Cfg.MballMacro ? "On" : "Off")

    lastRitualKey := Cfg.RitualKey
    try Hotkey("*" Cfg.RitualKey, RunRitualCast, Cfg.RitualCast ? "On" : "Off")

    lastGoldenKey := Cfg.GoldenKey
    try Hotkey("*" Cfg.GoldenKey, SendGoldenTongue, Cfg.GoldenTongue ? "On" : "Off")
}

SendRobloxChatCommand(command) {
    SendInput("{Blind}/")
    Sleep(COMMAND_BURST_DELAY_MS)

    for char in StrSplit(command) {
        SendText(char)
        Sleep(COMMAND_BURST_DELAY_MS)
    }

    SendInput("{Enter}")
}

SendMballCommand(*) {
    if !Cfg.MballMacro || !WinActive(ROBLOX_EXE)
        return

    SendInput("{Blind}-")
    Sleep(COMMAND_BURST_DELAY_MS)
    SendText("mb all")
    Sleep(COMMAND_BURST_DELAY_MS)
    SendInput("{Enter}")
}

RunRitualCast(*) {
    if !Cfg.RitualCast || !WinActive(ROBLOX_EXE)
        return

    sequence := ParseKeySequence(Cfg.RitualSequence)
    if sequence.Length = 0 {
        FlashTip("Set a ritual sequence first.")
        return
    }

    for key in sequence {
        SendInput("{Blind}{" key "}")
        Sleep(Random(50, 150))
    }
}

SendGoldenTongue(*) {
    if !Cfg.GoldenTongue || !WinActive(ROBLOX_EXE)
        return

    SendInput("{Blind}.")
    Sleep(35)
    SendInput("{Enter}")
}

ParseKeySequence(value) {
    keys := []
    value := Trim(value)
    if value = ""
        return keys

    if RegExMatch(value, "[,\s]") {
        for part in StrSplit(value, [",", " ", "`t", "`n", "`r"]) {
            cleanedPart := Trim(part)
            if cleanedPart = ""
                continue
            key := NormalizeKeyName(cleanedPart)
            if key != ""
                keys.Push(key)
        }
        return keys
    }

    for char in StrSplit(value)
        keys.Push(NormalizeKeyName(char))
    return keys
}

; ---------------------------------------------------------------------------
; Gank ping & Shared Database Network Logic
; ---------------------------------------------------------------------------

OpenGankPing(*) {
    DestroyGui("Gank")
    gankGui := Gui("+AlwaysOnTop +ToolWindow", "Gank Ping")
    gankGui.BackColor := Theme.Bg
    Ui.Gank := gankGui

    gankGui.SetFont("s11 w900 c" Theme.Text, "Segoe UI")
    gankGui.AddText("x16 y14 w260 h24", "Gank Ping")
    gankGui.SetFont("s8 c" Theme.Muted, "Segoe UI")
    gankGui.AddText("x16 y42 w340 h18", "Pick the luminant and location, then send the map ping.")

    gankGui.SetFont("s8 w700 c" Theme.Muted, "Segoe UI")
    gankGui.AddText("x16 y74 w130 h18", "LUMINANT")
    luminant := gankGui.AddDropDownList("x16 y94 w180 Background" Theme.Panel " c" Theme.Text, ["Etrean Luminant", "Eastern Luminant"])
    luminant.Value := 1

    gankGui.AddText("x220 y74 w130 h18", "LOCATION")
    location := gankGui.AddDropDownList("x220 y94 w180 Background" Theme.Panel " c" Theme.Text, GetLocationsForLuminant("Etrean Luminant"))
    location.Value := 1

    luminant.OnEvent("Change", (*) => RefreshLocationChoices(luminant, location))

    gankGui.AddText("x16 y134 w130 h18", "SERVER")
    server := gankGui.AddEdit("x16 y154 w180 h24 Background" Theme.Panel " c" Theme.Text, "")

    gankGui.AddText("x220 y134 w130 h18", "ISLAND")
    island := gankGui.AddEdit("x220 y154 w180 h24 Background" Theme.Panel " c" Theme.Text, "")

    gankGui.SetFont("s8 w700 c" Theme.Text, "Segoe UI")
    gankGui.AddButton("x16 y202 w120 h30 Default", "Send Ping").OnEvent("Click", SendGankPingFromPanel.Bind(luminant, location, server, island))
    gankGui.AddButton("x144 y202 w90 h30", "Close").OnEvent("Click", (*) => DestroyGui("Gank"))
    gankGui.Show("w420 h252")
}

RefreshLocationChoices(luminant, location, *) {
    choices := GetLocationsForLuminant(luminant.Text)
    location.Delete()
    location.Add(choices)
    location.Value := 1
}

GetLocationsForLuminant(luminant) {
    if luminant = "Eastern Luminant" {
        return ["Minityrsia", "Songseeker Wilds", "Fort Merit - Hive", "North side of Hive", "Greathive Aratel", "Monkeys Paw"]
    }
    return ["Etris", "Lower and Upper Erisia", "Isle of Vigils", "Summer Isle", "Starswept Valley"]
}

SendGankPingFromPanel(luminant, location, server, island, *) {
    if Cfg.Webhook = "" {
        MsgBox("Add a Discord webhook in Setup first.")
        return
    }

    lum := luminant.Text
    loc := location.Text
    srv := Trim(server.Value)
    isl := Trim(island.Value)

    if srv = "" {
        MsgBox("Enter the Deepwoken server name first.")
        return
    }

    if isl = ""
        isl := loc

    mapPath := CreateGankMapImage(lum, loc, srv, isl)
    if mapPath = "" {
        MsgBox("Could not create the gank map image.")
        return
    }

    ; Sync location to the shared network database
    SendMapPingToTeam(lum, loc, srv, isl)

    ; Send your original Discord webhook post
    SendGankWebhook(lum, loc, srv, isl, mapPath)
}

SendMapPingToTeam(luminant, location, server, island) {
    if (GLOBAL_DB_URL == "")
        return
        
    nowEpoch := DateDiff(A_NowUTC, "19700101000000", "Seconds")
    payload := '{"luminant":"' luminant '","location":"' location '","server":"' server '","island":"' island '","timestamp":' nowEpoch '}'
    
    try {
        req := ComObject("WinHttp.WinHttpRequest.5.1")
        req.Open("PUT", GLOBAL_DB_URL, true) 
        req.SetRequestHeader("Content-Type", "application/json")
        req.Send(payload)
        FlashTip("Map coordinates synced to team database!")
    }
}

ListenForTeamPings() {
    global LAST_KNOWN_PING_TIME

    if (GLOBAL_DB_URL == "" || !WinActive(ROBLOX_EXE))
        return

    try {
        req := ComObject("WinHttp.WinHttpRequest.5.1")
        req.Open("GET", GLOBAL_DB_URL, true)
        req.Send()
        req.WaitForResponse(1)
        
        if (req.Status == 200) {
            response := req.ResponseText
            RegExMatch(response, '"timestamp":\s*(\d+)', &matchTime)
            
            if (matchTime) {
                serverTime := Integer(matchTime[1])
                
                if (LAST_KNOWN_PING_TIME == 0) {
                    LAST_KNOWN_PING_TIME := serverTime
                    return
                }
                
                if (serverTime > LAST_KNOWN_PING_TIME) {
                    LAST_KNOWN_PING_TIME := serverTime
                    
                    RegExMatch(response, '"luminant":"([^"]+)"', &matchLum)
                    RegExMatch(response, '"location":"([^"]+)"', &matchLoc)
                    RegExMatch(response, '"server":"([^"]+)"', &matchSrv)
                    RegExMatch(response, '"island":"([^"]+)"', &matchIsl)
                    
                    TriggerGlobalPingNotification(matchLum[1], matchLoc[1], matchSrv[1], matchIsl[1])
                }
            }
        }
    }
}

TriggerGlobalPingNotification(lum, loc, srv, isl) {
    SoundPlay("*64") 
    TrayTip("TEAM GANK MARKER", loc " (" lum ")`nServer: " srv, 2)
    CreateGankMapImage(lum, loc, srv, isl)
}

CreateGankMapImage(luminant, location, server, island) {
    mapPath := A_Temp "\cage_gank_ping.png"
    psPath := A_Temp "\cage_gank_map.ps1"
    sourceMap := GetMapImagePath(location)
    locs := GetLocationsForLuminant(luminant)
    index := 1
    for i, name in locs {
        if name = location {
            index := i
            break
        }
    }

    script := '
(
Add-Type -AssemblyName System.Drawing
$bmp = New-Object Drawing.Bitmap 900,520
$g = [Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = "AntiAlias"
$bg = [Drawing.ColorTranslator]::FromHtml("#08090B")
$panel = [Drawing.ColorTranslator]::FromHtml("#151821")
$red = [Drawing.ColorTranslator]::FromHtml("#D91F32")
$muted = [Drawing.ColorTranslator]::FromHtml("#A7ADBB")
$text = [Drawing.Brushes]::White
$g.Clear($bg)
$g.FillRectangle((New-Object Drawing.SolidBrush $panel), 24, 24, 852, 472)
$g.DrawRectangle((New-Object Drawing.Pen $red, 4), 24, 24, 852, 472)
$titleFont = New-Object Drawing.Font("Segoe UI", 24, [Drawing.FontStyle]::Bold)
$font = New-Object Drawing.Font("Segoe UI", 13, [Drawing.FontStyle]::Regular)
$small = New-Object Drawing.Font("Segoe UI", 10, [Drawing.FontStyle]::Regular)
$g.DrawString("DEEPWOKEN GANK PING", $titleFont, $text, 48, 42)
$g.DrawString("Luminant: ' PsQuote(luminant) '", $font, $text, 52, 94)
$g.DrawString("Location: ' PsQuote(location) '", $font, $text, 52, 124)
$g.DrawString("Island: ' PsQuote(island) '", $font, $text, 52, 154)
$g.DrawString("Server: ' PsQuote(server) '"
)'
    return mapPath
}

PsQuote(text) {
    return StrReplace(text, "'", "''")
}

GetMapImagePath(location) {
    return ""
}

SendGankWebhook(lum, loc, srv, isl, mapPath) {
    return
}

FlashTip(message) {
    ToolTip(message)
    SetTimer((*)=> ToolTip(), -2500)
}

; ---------------------------------------------------------------------------
; Game Hooks & Core Intercept Loops
; ---------------------------------------------------------------------------

#HotIf WinActive(ROBLOX_EXE)

$*f:: {
    ; Blocks extra F presses while the 1.2s parry cooldown is active.
    if !TryStartParryTimer()
        return

    ; Normal parry input.
    SendInput("{Blind}f")

    ; Fast Feint: F -> M2 -> F.
    if Cfg.FastFeint {
        Sleep(35)
        Click("Right")
        Sleep(35)
        SendInput("{Blind}f")
    }

    ; Roll Parry: F -> Q -> M2.
    if Cfg.RollParry {
        Sleep(60)
        SendInput("{Blind}q")
        Sleep(45)
        Click("Right")
    }
}

~*Ctrl:: {
    ; Auto Uppercut: hold Ctrl and tap M1 once.
    if !Cfg.AutoUppercut
        return

    Sleep(25)
    ClickOnce(12)
}

~*q:: {
    State.LastQ := A_TickCount
}

~*Space:: {
    State.LastSpace := A_TickCount
}

-:: {
    if !Cfg.DashBang
        return
    SendInput("{Blind}-")
    Sleep(25)
    SendText("!")
}

$LButton:: {
    if !Cfg.M1Repeat && !Cfg.SprintM1 {
        PassThroughLeftClick()
        return
    }

    startTick := A_TickCount

    ; Friend-style fast M1 spam: click repeatedly while LButton is held.
    if Cfg.M1Repeat && !Cfg.SprintM1 {
        while ShouldContinueM1(startTick) {
            ClickOnce(3)
            if !SleepWhileM1Held(3, startTick)
                break
        }
        return
    }

    interval := GetSwingInterval()

    try {
        while ShouldContinueM1(startTick) {
            ; Sprint M1 now taps the configured Sprint Key, not hardcoded Shift.
            TapSprintKey(startTick)
            Sleep(18)
            ClickOnce(10)

            now := A_TickCount
            if Cfg.Silentheart {
                if GetKeyState("Ctrl", "P")
                    SetMoveUsed("Ankle Cutter")
                else if State.LastQ > 0 && now - State.LastQ < 1000
                    SetMoveUsed("Mayhem")
                else if State.LastSpace > 0 && now - State.LastSpace < 1500
                    SetMoveUsed("Relentless Hunt")
            }

            if !SleepWhileM1Held(interval, startTick)
                break
        }
    } finally {
        PressSprintUp()
    }
}
~*RButton:: {
    if Cfg.Silentheart && GetKeyState("Ctrl", "P")
        SetMoveUsed("Rising Star")
}

PassThroughLeftClick() {
    Click("Down")
    while GetKeyState("LButton", "P")
        Sleep(10)
    Click("Up")
}

ShouldContinueM1(startTick) {
    return GetKeyState("LButton", "P") && (A_TickCount - startTick < M1_FAILSAFE_MS) && WinActive(ROBLOX_EXE)
}

SleepWhileM1Held(ms, startTick) {
    end := A_TickCount + ms
    while A_TickCount < end {
        if !ShouldContinueM1(startTick)
            return false
        Sleep(5)
    }
    return true
}

ClickOnce(duration) {
    Click("Down")
    Sleep(duration)
    Click("Up")
}

PressSprintDown() {
    key := NormalizeKeyName(Cfg.SprintKey)
    if key = ""
        key := "Shift"
    SendInput("{Blind}{" key " Down}")
}

PressSprintUp() {
    key := NormalizeKeyName(Cfg.SprintKey)
    if key = ""
        key := "Shift"
    SendInput("{Blind}{" key " Up}")
}

TapSprintKey(startTick) {
    ; Uses the configured Sprint Key from the Combat menu.
    key := NormalizeKeyName(Cfg.SprintKey)
    if key = ""
        key := "Shift"

    SendInput("{Blind}{" key " Down}")
    SleepWhileM1Held(22, startTick)
    SendInput("{Blind}{" key " Up}")
}

TapSprintCancel(startTick) {
    ; Backwards-compatible name, kept in case you reuse it later.
    TapSprintKey(startTick)
}

GetSwingInterval() {
    return SPRINT_M1_INTERVAL_MS
}

SetMoveUsed(name) {
    if MoveData.Has(name)
        MoveData[name].Last := A_TickCount / 1000
}

#HotIf

Home:: Reload()
Esc:: ExitApp()