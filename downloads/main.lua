Notify("Loaded Deepwoken Plugin", 3)

local configPath = "data/deepwoken_plugin.json"
local g_running = true

local settings = {
    flySpeed = 60.0,
    walkSpeed = 16.0,
    flyUpwardGravity = 1,

    walkSpeedEnabled = false,
    espEnabled = false,
    autoRitualCast = false,
    noFallEnabled = false,

    espNameOpacity = 1.0,
    espBoxOpacity = 1.0,
    espHealthBarOpacity = 1.0,
    espHealthTextOpacity = 1.0,
    espDistanceOpacity = 1.0,
    
    voidMobsDistance = 250.0,

    showMobs = false,
    renderBox = false,
    showHealthBar = false,
    showHealthText = false,
    showDistance = false,
    scaleText = false,
    showName = true,

    flyKey = "F1",
    noclipKey = "F2",
    lockKey = "F5",
    unloadKey = "PAGEUP",
    walkSpeedKey = "F3"
}

local function GetModList()
    local GROUP_ID = 5212858
    local ROLES = {
        47808861, 382124119, 93830919, 75964366, 75964360, 75964357,
        382708095, 75964349, 36770673, 34698071, 108688311, 34698070
    }

    local usernames = {}
    local seen = {}

    for _, roleId in ipairs(ROLES) do
        local cursor = nil

        while true do
            local url = string.format(
                "https://groups.roblox.com/v1/groups/%d/roles/%d/users?limit=100",
                GROUP_ID,
                roleId
            )

            if cursor then
                url = url .. "&cursor=" .. cursor
            end

            local response = network.GetHttps(url)
            if not response or response == "" then
                break
            end

            local success, data = pcall(json.Decode, response)
            if not success or not data or not data.data then
                break
            end

            for _, user in pairs(data.data) do
                local username = user.username
                if username and not seen[username] then
                    seen[username] = true
                    table.insert(usernames, username)
                end
            end

            if data.nextPageCursor then
                cursor = data.nextPageCursor
            else
                break
            end
        end
    end

    print("Fetched " .. #usernames .. " unique usernames from group roles.")
    return usernames
end

local function LoadConfig()
    local loaded = config.Load(configPath)
    local changed = false

    if type(loaded) ~= "table" then
        loaded = {}
        config.Create(configPath)
        Notify("Config Created", 2)
    end

    for k,v in pairs(settings) do
        local val = loaded[k]
        if val ~= nil then
            local expectedType = type(v)
            if type(val) == expectedType then
                settings[k] = val
            elseif expectedType == "number" then
                local n = tonumber(val)
                if n then settings[k] = n end
            elseif expectedType == "boolean" then
                if val == "true" then settings[k] = true
                elseif val == "false" then settings[k] = false end
            elseif expectedType == "string" then
                local s = tostring(val)
                s = s:match("^%s*(.-)%s*$")
                settings[k] = s:upper()
            end
        else
            changed = true
        end
    end

    if changed then
        config.Save(configPath, settings)
    end

    Notify("Config Loaded", 2)
end

local function SaveConfig()
    config.Save(configPath, settings)
    Notify("Config Saved", 5)
end

-- doesnt save
local flyEnabled = false
local noclipEnabled = false
local lockEnabled = false

local gotoDepths_Eastern = false
local gotoDepths_Etrean = false

local gotoEtrean = false
local gotoEastern = false

---//

local liveFolderCache = {}
local moderatorNames = {}

local espCache = {}
local localHrp = GetLocalHRP()
local localHumanoid = GetLocalHumanoid()
local workspace = game:GetService("Workspace")
local camera = workspace:FindFirstChildOfClass("Camera")
local repStorage = game:GetService("ReplicatedStorage")
local repStorageRequests = nil
local nameOffset = GetOffset("Name")
local playersService = game:GetService("Players")
local playerGui = GetLocalPlayer():FindFirstChild("PlayerGui")
local symbolsFrame = GetLocalPlayer():FFC("PlayerGui"):FFC("SpellGui") and GetLocalPlayer():FFC("PlayerGui"):FFC("SpellGui"):FFC("SpellFrame") and GetLocalPlayer():FFC("PlayerGui"):FFC("SpellGui"):FFC("SpellFrame"):FFC("Symbols")

local playerList = {}
local clickedSymbols = {}
local lastSymbolUpdate = 0
local ritualDelay = 0.15

local voidAllMobs = false
local voidMobsList = {}
local spectatedEntity = nil

local function HandleFullEsp()
    local cameraPos = Vector3.new(0,0,0)
    if camera and camera.Class == "Camera" then
        cameraPos = camera:GetCameraPosition()
    end

    for char,data in pairs(liveFolderCache) do
        local hrp = data.HumanoidRootPart
        local hum = data.Humanoid

        if hrp then
            local worldPos = hrp.CFrame.Position
            local point = WorldToScreen(worldPos)

            if point then
                local referenceDistance = 120
                local distance = (cameraPos - worldPos):Magnitude()
                local scale = referenceDistance / distance

                if scale < 0.1 then
                    scale = 0.1
                elseif scale > 6 then
                    scale = 6
                end

                table.insert(espCache,{
                    Name = char.Name,
                    Point = point,
                    Scale = scale,
                    Distance = distance,
                    Health = hum and hum.Health or 0,
                    MaxHealth = hum and hum.MaxHealth or 0
                })
            end
        end
    end
end

local function HandlePlayerOnlyEsp()
    local players = phantom.GetPlayers()
    local cameraPos = Vector3.new(0,0,0)
    if camera then
        cameraPos = camera:GetCameraPosition()
    end

    for _,plr in pairs(players) do
        local char = plr.Character
        if char then
            local hrp = char:FindFirstChild("HumanoidRootPart")
            local hum = char:FindFirstChildOfClass("Humanoid")

            if hrp then
                local worldPos = hrp.CFrame.Position
                local point = WorldToScreen(worldPos)

                if point then
                    local referenceDistance = 120
                    local distance = (cameraPos - worldPos):Magnitude()
                    local scale = referenceDistance / distance

                    if scale < 0.1 then
                        scale = 0.1
                    elseif scale > 6 then
                        scale = 6
                    end

                    if not distance then
                        distance = 0
                    end

                    table.insert(espCache,{
                        Name = plr.Name,
                        Point = point,
                        Scale = scale,
                        Distance = distance,
                        Health = hum and hum.Health or 0,
                        MaxHealth = hum and hum.MaxHealth or 0
                    })
                end
            end
        end
    end
end

local mobsCache = {}

local function HandleEntityList()
    local players = {}
    mobsCache = {}

    for _, v in pairs(liveFolderCache) do
        if v.IsPlayer then
            table.insert(players, v)
        else
            table.insert(mobsCache, v)
        end
    end

    table.sort(players, function(a, b)
        return a.CharName:lower() < b.CharName:lower()
    end)

    table.sort(mobsCache, function(a, b)
        return a.CharName:lower() < b.CharName:lower()
    end)

    ui.Begin("Deepwoken Entities")
    if ui.Button("Stop Spectate") then
        spectatedEntity = nil
    end
    ui.Text("Note: Spectate requires fixed update to work properly.")
    ui.BeginTabBar("deepwoken_entities_tabs")

    if ui.BeginTab("Players") then
        for _, v in ipairs(players) do
            local name = v.CharName
            local clr = Color4.new(1,1,1,1)
            if v.IsModerator then
                name = name .. " [MOD]"
                clr = Color4.new(1,0,0,1)
            end
            ui.Text(name, clr)
            ui.SameLine()
            if v and ui.Button("Spectate##"..v.CharName) then
                spectatedEntity = v
            end
        end
    end
    ui.EndTab()

    if ui.BeginTab("Mobs") then
        for _, v in ipairs(mobsCache) do
            ui.Text(v.CharName)
            ui.SameLine()
            if ui.Button("Void##"..v.CharName) then
                local alreadyVoid = false
                for _, voidMob in ipairs(voidMobsList) do
                    if voidMob.CharName == v.CharName then
                        alreadyVoid = true
                        break
                    end
                end

                if alreadyVoid then
                    Notify(v.CharName .. " is already voided.", 1.5)
                else
                    Notify("Voiding " .. v.CharName, 1.5)
                    table.insert(voidMobsList, v)
                end
            end

            ui.SameLine()
            if v and ui.Button("Spectate##"..v.CharName) then
                spectatedEntity = v
            end
        end
    end
    ui.EndTab()

    if ui.BeginTab("Void Mobs") then
        settings.voidMobsDistance = ui.SliderFloat("Void Mobs Distance", settings.voidMobsDistance, 1, 10000)
        voidAllMobs = ui.Checkbox("Void All Mobs", voidAllMobs)
        ui.Separator()

        for _, v in ipairs(voidMobsList) do
            ui.Text(v.CharName)
            ui.SameLine()
            if ui.Button("Unvoid##"..v.CharName) then
                for i = #voidMobsList, 1, -1 do
                    if voidMobsList[i] == v then
                        table.remove(voidMobsList, i)
                        break
                    end
                end
            end
        end
    end
    ui.EndTab()

    ui.EndTabBar()
    ui.End()
end

LoadConfig()

Notify("Fetching Moderator List (Requires Web Requests Enabled)...", 6)
moderatorNames = GetModList()
Notify("Fetched " .. #moderatorNames .. " moderators usernames.", 4) 

local moderatorLookup = {}
for _,name in ipairs(moderatorNames) do
    moderatorLookup[name] = true
end

local updateBind = BindEvent("OnUpdate", function()
    if not lockEnabled and input.KeyPressed(settings.flyKey) then
        flyEnabled = not flyEnabled
    end

    if not lockEnabled and input.KeyPressed(settings.walkSpeedKey) then
        settings.walkSpeedEnabled = not settings.walkSpeedEnabled
    end 

    if input.KeyPressed(settings.unloadKey) then
        g_running = false
    end

    if input.KeyPressed(settings.lockKey) then
        lockEnabled = not lockEnabled

        if lockEnabled and localHrp then
            local localChar = GetLocalCharacter()
            if not localChar then return end
            local root = localChar:FindFirstChild("RootCollider")
            if root then
                root.CanCollide = true
            end
            noclipEnabled = false
        end

        if noFallSavedAddr and noFallSavedOriginal and noFallSavedAddr ~= 0 and noFallSavedOriginal ~= 0 then
            memory.Write(noFallSavedAddr,noFallSavedOriginal,"usize")
        end

        flyEnabled = false
    end

    if not lockEnabled and input.KeyPressed(settings.noclipKey) and localHrp then
        local localChar = localHrp.Parent
        if not localChar then return end
        local root = localChar:FindFirstChild("RootCollider")
        if root then
            noclipEnabled = not noclipEnabled
            root.CanCollide = not noclipEnabled
        end
    end

    if settings.autoRitualCast and symbolsFrame then
        local children = symbolsFrame:GetChildren()

        if #children == 0 then
            clickedSymbols = {}
        else
            local now = os.clock()

            if now - lastSymbolUpdate > ritualDelay then
                for _,symbol in ipairs(children) do
                    local id = symbol.Address

                    if id and not clickedSymbols[id] then
                        local label = symbol:FindFirstChild("TextLabel")

                        if label then
                            local char = tostring(label.Text):match("^%s*(.-)%s*$"):upper()

                            if char == "V" or char == "X" or char == "C" or char == "Z" then
                                clickedSymbols[id] = true
                                lastSymbolUpdate = now
                                input.PressKey(char, 50)
                                break
                            end
                        end
                    end
                end
            end
        end
    end

    if settings.espEnabled then
        espCache = {}

        if settings.showMobs then
            HandleFullEsp()
        else
            HandlePlayerOnlyEsp()
        end
    end
end,"Deepwoken Script Update")

local knownPlayers = {}

local slowUpdate = BindEvent("OnSlowUpdate", function()
    localHrp = GetLocalHRP()
    localHumanoid = GetLocalHumanoid()
    workspace = game:GetService("Workspace")
    repStorage = game:GetService("ReplicatedStorage")
    playerGui = GetLocalPlayer():FindFirstChild("PlayerGui")
    playersService = game:GetService("Players")

    if playerGui then
        local spellGui = playerGui:FindFirstChild("SpellGui")
        if spellGui then
            local spellFrame = spellGui:FindFirstChild("SpellFrame")
            if spellFrame then
                symbolsFrame = spellFrame:FindFirstChild("Symbols")
            end
        end
    end

    if repStorage then
        local requests = repStorage:FindFirstChild("Requests")
        if requests then
            repStorageRequests = requests
        end
    end

    if workspace then
        camera = workspace:FindFirstChildOfClass("Camera")
        local liveFolder = workspace:FindFirstChild("Live")

        if liveFolder and localHrp then
            liveFolderCache = {}

            for _,char in pairs(liveFolder:GetChildren()) do
                if not char or char.Address == localHrp.Parent.Address then
                    goto continue
                end

                local hrp = char:FindFirstChild("HumanoidRootPart")
                local hum = char:FindFirstChildOfClass("Humanoid")
                local distance = 0
                if localHrp and hrp then
                    local localPos = localHrp.Position
                    local hrpPos = hrp.Position
                    distance = (localPos - hrpPos):Magnitude()
                end

                if hrp and hum then
                    local isPlayer = not char.Name:match("^%.")
                    local isMod = false

                    if isPlayer and moderatorLookup[char.Name] then
                        isMod = true
                    end

                    liveFolderCache[char] = {
                        HumanoidRootPart = hrp,
                        Humanoid = hum,
                        Distance = distance,
                        CharName = char.Name,
                        IsPlayer = isPlayer,
                        IsModerator = isMod
                    }
                end

                ::continue::
            end
        end
    else
        liveFolderCache = {}
    end

    if playersService then
        knownPlayers = knownPlayers or {}

        local current = {}

        for _, plr in pairs(playersService:GetChildren()) do
            current[plr.Name] = plr

            if not knownPlayers[plr.Name] then
                knownPlayers[plr.Name] = plr
                --print("Player joined:", plr.Name)

                if moderatorLookup[plr.Name] then
                    Notify("MODERATOR JOINED: "..plr.Name, 8)
                end
            end
        end

        for usrName, plr in pairs(knownPlayers) do
            if not current[usrName] then
                --print("Player left:", plr.Name)
                knownPlayers[usrName] = nil
            end
        end
    end
end, "Deepwoken Script Slow Update")

local noFallDebounce = false
local noFallRestoreTime = 0
local noFallSavedAddr = 0
local noFallSavedOriginal = 0

local fixedUpdateBind = BindEvent("OnFixedUpdate", function()
    local _localPlr = GetLocalPlayer()
    if not _localPlr or _localPlr.Address == 0 then
        spectatedEntity = nil
        voidMobsList = {}
        return
    end
    local flyDir = GetFlyDirection()

    if not lockEnabled and flyEnabled and localHrp then
        if flyDir.x ~= 0 or flyDir.y ~= 0 or flyDir.z ~= 0 then
            localHrp.Velocity = flyDir * settings.flySpeed
        else
            localHrp.Velocity = Vector3.new(0,settings.flyUpwardGravity,0)
        end
    end

    if not lockEnabled and settings.walkSpeedEnabled and localHumanoid and not flyEnabled and localHrp then
        local moveDir = localHumanoid.MoveDirection
        if not moveDir or moveDir == Vector3.new(0,0,0) then return end
        localHrp.Velocity = Vector3.new(moveDir.x * settings.walkSpeed,localHrp.Velocity.y,moveDir.z * settings.walkSpeed)
    end

    if repStorageRequests and localHrp then
        if not settings.noFallEnabled then
            if noFallSavedAddr and noFallSavedOriginal and noFallSavedAddr ~= 0 and noFallSavedOriginal ~= 0 then
                memory.Write(noFallSavedAddr,noFallSavedOriginal,"usize")
                noFallSavedAddr = 0
                noFallSavedOriginal = 0
            end
            goto continue
        end

        local clientEffect = repStorageRequests:FindFirstChild("ClientEffectDirect")
        if clientEffect then
            local nameAddr = clientEffect.Address + nameOffset
            local original = memory.Read(nameAddr,"usize") or 0
            local velocity = localHrp.Velocity

            if not noFallDebounce and nameAddr ~= 0 and original ~= 0 and (velocity.y < -155.0) or (flyEnabled and velocity.y < (settings.flySpeed - 0.1)) then
                memory.Write(nameAddr,original + 0x8,"usize")
                noFallDebounce = true
                noFallRestoreTime = os.clock() + 0.05
                noFallSavedAddr = nameAddr
                noFallSavedOriginal = original
            end
        end
        ::continue::
    end

    if noFallDebounce and os.clock() >= noFallRestoreTime then
        memory.Write(noFallSavedAddr,noFallSavedOriginal,"usize")
        noFallDebounce = false
    end

    local _localPlayer = GetLocalPlayer()
    if (_localPlayer and _localPlayer.Address ~= 0 and spectatedEntity and spectatedEntity.HumanoidRootPart and spectatedEntity.HumanoidRootPart.Address ~= 0) then
        SpectatePart(spectatedEntity.HumanoidRootPart)
    else
        spectatedEntity = nil
    end

    if voidAllMobs then
        for _,v in ipairs(mobsCache) do
            if v and v.HumanoidRootPart and v.Distance and v.Distance <= settings.voidMobsDistance then
                local pos = v.HumanoidRootPart.Position or Vector3.new(0,0,0)
                v.HumanoidRootPart.Position = Vector3.new(pos.x,-3000,pos.z)
                v.HumanoidRootPart.Velocity = Vector3.new(0,-16384,0)
            end
        end
    else
        for _,v in ipairs(voidMobsList) do
            for i = #voidMobsList, 1, -1 do
                local v = voidMobsList[i]
                if not v or not v.HumanoidRootPart or v.HumanoidRootPart.Address == 0 then
                    table.remove(voidMobsList, i)
                end
            end

            for _, v in ipairs(voidMobsList) do
                if v and v.HumanoidRootPart then
                    local pos = v.HumanoidRootPart.Position or Vector3.new(0,0,0)
                    v.HumanoidRootPart.Position = Vector3.new(pos.x,-3000,pos.z)
                    v.HumanoidRootPart.Velocity = Vector3.new(0,-16384,0)
                end
            end
        end
    end

    if gotoDepths_Eastern then
        if (not GetLocalCharacter()) then
            gotoDepths_Eastern = false
            return
        end
        localHrp.Position = Vector3.new(-5188.177, -1.8166779, 3111.2102)
    elseif gotoDepths_Etrean then
        if (not GetLocalCharacter()) then
            gotoDepths_Etrean = false
            return
        end
        localHrp.Position = Vector3.new(1014, -1.8, 3663)
    end

    if gotoEastern then
        localHrp.Position = Vector3.new(-2632.0, 628.0, -6707.0)
        if (not GetLocalCharacter()) then
            gotoEastern = false
            return
        end
    elseif gotoEtrean then
        localHrp.Position = Vector3.new(-514.263, 665.1743, -4772.321)
        if (not GetLocalCharacter()) then
            gotoEtrean = false
            return
        end
    end
end,"Deepwoken Script Fixed Update")

local drawBind = BindEvent("OnDraw", function()
    drawing.BeginFrame("Overlay")
    drawing.FrameText("FUNCTIONS LOCKED ["..settings.lockKey.."]: "..(lockEnabled and "ON" or "OFF"))
    drawing.FrameText("Fly ["..settings.flyKey.."]: "..(flyEnabled and "ON" or "OFF"))
    drawing.FrameText("Noclip ["..settings.noclipKey.."]: "..(noclipEnabled and "ON" or "OFF"))
    drawing.FrameText("Movement Speed ["..settings.walkSpeedKey.."]: "..(settings.walkSpeedEnabled and "ON" or "OFF"))
    drawing.EndFrame()

    ui.Begin("Deepwoken Plugin MENU")
    if ui.Button("Save Config") then
        SaveConfig()
    end
    ui.BeginTabBar("deepwoken_tabs")

    if ui.BeginTab("Movement") then
        settings.walkSpeed = ui.SliderFloat("Movement Speed", settings.walkSpeed, 1, 100)
        ui.Separator()
        ui.Text("=== Flight ===")
        settings.flySpeed = ui.SliderFloat("Fly Speed", settings.flySpeed, 1, 100)
        settings.flyUpwardGravity = ui.SliderFloat("Fly Upward Gravity", settings.flyUpwardGravity, 0, 10)
        ui.Text("Note: You shouldn’t slide while in flight due to No-Fall (may be fixed in a future update).");
    end
    ui.EndTab()

    if ui.BeginTab("Misc") then
        ui.Text("=== Utility ===")
        settings.noFallEnabled = ui.Checkbox("No Fall Damage", settings.noFallEnabled)
        settings.autoRitualCast = ui.Checkbox("Auto Ritual Cast", settings.autoRitualCast)
    end
    ui.EndTab()

    if ui.BeginTab("ESP") then
        settings.espEnabled = ui.Checkbox("ESP Enabled", settings.espEnabled)

        if settings.espEnabled then
            settings.showMobs = ui.Checkbox("Show Mobs", settings.showMobs)

            ui.Separator()
            settings.scaleText = ui.Checkbox("Scale Text", settings.scaleText)

            settings.showName = ui.Checkbox("Show Name", settings.showName)
            settings.espNameOpacity = ui.SliderFloat("Name Opacity", settings.espNameOpacity, 0.1, 1.0)

            settings.renderBox = ui.Checkbox("Render Box", settings.renderBox)
            settings.espBoxOpacity = ui.SliderFloat("Box Opacity", settings.espBoxOpacity, 0.1, 1.0)

            settings.showHealthBar = ui.Checkbox("Show Health Bar", settings.showHealthBar)
            settings.espHealthBarOpacity = ui.SliderFloat("Health Bar Opacity", settings.espHealthBarOpacity, 0.1, 1.0)

            settings.showHealthText = ui.Checkbox("Show Health Text", settings.showHealthText)
            settings.espHealthTextOpacity = ui.SliderFloat("Health Text Opacity", settings.espHealthTextOpacity, 0.1, 1.0)

            settings.showDistance = ui.Checkbox("Show Distance", settings.showDistance)
            settings.espDistanceOpacity = ui.SliderFloat("Distance Opacity", settings.espDistanceOpacity, 0.1, 1.0)
        end
    end
    ui.EndTab()

    if ui.BeginTab("Teleport") then
        ui.Text("=== Teleport ===")
        if ui.Button("Teleport to Depths") then
            if localHrp then
                if game.PlaceID == 6473861193 then
                    gotoDepths_Eastern = true
                elseif game.PlaceID == 6032399813 then
                    gotoDepths_Etrean = true
                end
            end
        end
        if ui.Button("Teleport to Other Luminant") then
            if localHrp then
                if game.PlaceID == 6473861193 then
                    gotoEtrean = true
                elseif game.PlaceID == 6032399813 then
                    gotoEastern = true
                end
            end
        end
    end
    ui.EndTab()

    if ui.BeginTab("Keybinds") then
        ui.Text("NOTE: This keybind system is temporary and will be replaced with a more robust solution in the future.")
        ui.Separator()
        settings.flyKey = ui.InputText("Fly Key", settings.flyKey)
        settings.noclipKey = ui.InputText("Noclip Key", settings.noclipKey)
        settings.lockKey = ui.InputText("Lock Key", settings.lockKey)
        settings.walkSpeedKey = ui.InputText("Walk Speed Key", settings.walkSpeedKey)
        settings.unloadKey = ui.InputText("Unload Key", settings.unloadKey)

        if ui.Button("Reset Keybinds") then
            settings.flyKey = "F1"
            settings.noclipKey = "F2"
            settings.lockKey = "F5"
            settings.walkSpeedKey = "F3"
            settings.unloadKey = "PAGEUP"
        end

        ui.Separator()
        ui.Text("Valid Key Names:")
        ui.Separator()

        ui.Text("BACK - Backspace")
        ui.Text("TAB - Tab")
        ui.Text("RETURN / ENTER - Return")
        ui.Text("SHIFT - Shift")
        ui.Text("CONTROL / CTRL - Control")
        ui.Text("MENU / ALT - Alt")
        ui.Text("PAUSE - Pause")
        ui.Text("CAPITAL / CAPSLOCK - Caps Lock")
        ui.Text("ESCAPE / ESC - Escape")
        ui.Text("SPACE - Space")

        ui.Text("PRIOR / PAGEUP - Page Up")
        ui.Text("NEXT / PAGEDOWN - Page Down")
        ui.Text("END - End")
        ui.Text("HOME - Home")
        ui.Text("LEFT - Left Arrow")
        ui.Text("UP - Up Arrow")
        ui.Text("RIGHT - Right Arrow")
        ui.Text("DOWN - Down Arrow")
        ui.Text("INSERT - Insert")
        ui.Text("DELETE - Delete")

        ui.Text("0-9 - Number keys")
        ui.Text("A-Z - Letter keys")


        ui.Text("F1-F12 - Function keys (F7 IS A KILL KEY)")

        ui.Text("LSHIFT / RSHIFT")
        ui.Text("LCONTROL / RCONTROL")
        ui.Text("LMENU / RMENU")
    end
    ui.EndTab()

    ui.EndTabBar()
    ui.End()

    HandleEntityList()

    if not espCache or not settings.espEnabled then return end

    for _, data in pairs(espCache) do
        local boxSize = Vector2.new(35, 50) * data.Scale
        local topLeft = data.Point - boxSize / 2
        local bottomRight = data.Point + boxSize / 2

        local fontSize = 16
        if settings.scaleText then
            fontSize = math.max(10, boxSize.y / 6)
        end
        local textSpacing = fontSize * 1.2
        local topMiddle = Vector2.new(data.Point.x, topLeft.y)

        local nameColor = (string.sub(data.Name, 1, 1) == ".")
            and Color4.new(0.5, 1, 0.5, settings.espNameOpacity)
            or Color4.new(1, 1, 1, settings.espNameOpacity)

        if settings.showName then
            drawing.DrawText(
                Vector2.new(topMiddle.x - boxSize.x / 2, topMiddle.y - textSpacing),
                data.Name,
                nameColor,
                fontSize
            )
        end

        if settings.showHealthBar then
            local healthRatio = data.MaxHealth > 0 and (data.Health / data.MaxHealth) or 0
            local barWidth = 4 * (boxSize.x / 35)
            local barHeight = boxSize.y
            local barX = topLeft.x - barWidth - 3
            local barY = topLeft.y
            local filledHeight = barHeight * healthRatio

            drawing.DrawRectangle(
                Vector2.new(barX, barY),
                Vector2.new(barX + barWidth, barY + barHeight),
                Color4.new(1, 1, 1, settings.espHealthBarOpacity)
            )

            local fillColor
            if healthRatio > 0.5 then
                local t = (healthRatio - 0.5) / 0.5
                fillColor = Color4.new(0.56 * t + 1 * (1 - t), 0.93 * t + 0.65 * (1 - t), 0, settings.espHealthBarOpacity)
            elseif healthRatio > 0.10 then
                local t = (healthRatio - 0.10) / (0.5 - 0.10)
                fillColor = Color4.new(1, 0.65 * t, 0, settings.espHealthBarOpacity)
            else
                fillColor = Color4.new(1, 0, 0, settings.espHealthBarOpacity)
            end

            drawing.DrawFilledRectangle(
                Vector2.new(barX, barY + (barHeight - filledHeight)),
                Vector2.new(barWidth, filledHeight),
                fillColor
            )
        end

        local textOffset = 1

        if settings.showHealthText then
            drawing.DrawText(
                Vector2.new(topMiddle.x - boxSize.x / 2, topMiddle.y - (textOffset + 1) * textSpacing),
                "HP: " .. string.format("%.0f", data.Health) .. " / " .. string.format("%.0f", data.MaxHealth),
                Color4.new(0.5, 0.9, 0.9, settings.espHealthTextOpacity),
                fontSize
            )
            textOffset = textOffset + 1
        end

        if settings.showDistance then
            drawing.DrawText(
                Vector2.new(topMiddle.x - boxSize.x / 2, topMiddle.y - (textOffset + 1) * textSpacing),
                string.format("%.0f", data.Distance) .. "m",
                Color4.new(1.0, 0.84, 0.0, settings.espDistanceOpacity),
                fontSize
            )
            textOffset = textOffset + 1
        end

        if settings.renderBox then
            drawing.DrawRectangle(
                topLeft,
                bottomRight,
                Color4.new(1, 1, 1, settings.espBoxOpacity)
            )
        end
    end
end, "Deepwoken Script Draw")

local lostDataModelBind = BindEvent("OnDataModelLost", function()
    spectatedEntity = nil
    localHrp = nil
    localHumanoid = nil
    workspace = nil
    repStorage = nil
    playerGui = nil
    camera = nil
    liveFolderCache = {}
end, "Deepwoken Script DataModelLost")

while g_running do
    wait(1)
end

SaveConfig()

if noFallSavedAddr and noFallSavedOriginal and noFallSavedAddr ~= 0 and noFallSavedOriginal ~= 0 then
    memory.Write(noFallSavedAddr,noFallSavedOriginal,"usize")
end

UnbindEvent("OnDataModelLost", lostDataModelBind)
UnbindEvent("OnUpdate",updateBind)
UnbindEvent("OnFixedUpdate",fixedUpdateBind)
UnbindEvent("OnDraw",drawBind)
UnbindEvent("OnSlowUpdate",slowUpdate)