"""
The FML Macro
Hold-to-fire click macro with Better Swingspeed (left click) and
Always Feint (right click), plus Auto Mantra Feint and Auto Uppercut.

Requirements (install once):
    pip install pynput
    pip install pillow

Run:
    python the_fml_macro.py

Setup:
- Put "fml_icon.png" in the SAME folder as this script so the window/taskbar
  icon shows the FML logo. If it's missing, the app still runs fine, just
  without the custom icon.

Notes:
- Works globally (any window/app/game), not just inside this window.
- Using this in online games may violate that game's Terms of Service and
  can get you banned — that's on you, not this script.
"""
import tkinter as tk
import threading
import time
import os
from pynput.mouse import Controller as MouseController, Button, Listener as MouseListener
from pynput.keyboard import Controller as KeyboardController, Key
mouse = MouseController()
BG = '#000000'
PANEL_BG = '#0d0505'
BORDER_MAIN = '#7f1d1d'
TEXT_MUTED = '#a37373'
TEXT_MAIN = '#f2e6e6'
ACCENT_MAIN = '#dc2626'
TRACK_GREY = '#1a0d0d'
HOLD_INTERVAL = 0.1

class ToggleRow(tk.Frame):
    """A two-option toggle (e.g. Off / On)."""

    def __init__(self, master, options, default, accent=ACCENT_MAIN, on_change=None, **kw):
        super().__init__(master, bg=PANEL_BG, **kw)
        self.var = tk.StringVar(value=default)
        self.accent = accent
        self.on_change = on_change
        self.buttons = {}
        for i, opt in enumerate(options):
            b = tk.Label(self, text=opt, font=('Segoe UI', 10, 'bold'), bg=TRACK_GREY, fg=TEXT_MAIN, padx=14, pady=8, cursor='hand2')
            b.grid(row=0, column=i, sticky='nsew', padx=(0 if i == 0 else 2, 0))
            b.bind('<Button-1>', (lambda e, o=opt: self.select(o)))
            self.buttons[opt] = b
            self.grid_columnconfigure(i, weight=1)
        self.select(default)

    def select(self, opt):
        self.var.set(opt)
        for name, b in self.buttons.items():
            if name == opt:
                b.config(bg=self.accent, fg='#0d1117')
            else:
                b.config(bg=TRACK_GREY, fg=TEXT_MAIN)
        if self.on_change:
            self.on_change(opt)

    def get(self):
        return self.var.get()


class TheFMLMacro(tk.Tk):

    def __init__(self):
        super().__init__()
        self.title('The FML Macro')
        self.configure(bg=BG)
        self.geometry('460x520')
        self.resizable(False, False)
        self._set_icon()
        self.mantra_feint_enabled = False
        self.mantra_left_count = 0
        self.uppercut_enabled = False
        self.swingspeed_enabled = False
        self.always_feint_enabled = False
        self._injecting_click = False
        self.swingspeed_holding = False
        self.feint_holding = False
        self.keyboard = KeyboardController()
        self._build_ui()
        self._start_mouse_listener()

    def _set_icon(self):
        folder = os.path.dirname(os.path.abspath(__file__))
        png_path = os.path.join(folder, 'fml_icon.png')
        ico_path = os.path.join(folder, 'fml_icon.ico')
        if os.path.exists(png_path):
            try:
                from PIL import Image
                img = Image.open(png_path).convert('RGBA')
                sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
                img.save(ico_path, format='ICO', sizes=sizes)
            except Exception:
                pass
        if os.path.exists(ico_path):
            try:
                self.iconbitmap(default=ico_path)
            except Exception:
                pass
        try:
            self._icon_img = tk.PhotoImage(file=png_path)
            self.iconphoto(True, self._icon_img)
        except Exception:
            pass

    def _build_ui(self):
        header = tk.Frame(self, bg=BG)
        header.pack(fill='x', pady=(20, 6))
        tk.Label(header, text='THE FML MACRO', font=('Consolas', 18, 'bold'), bg=BG, fg=ACCENT_MAIN).pack()
        panel = tk.Frame(self, bg=PANEL_BG, highlightbackground=BORDER_MAIN, highlightthickness=1, bd=0)
        panel.pack(fill='both', expand=True, padx=20, pady=10, ipadx=14, ipady=14)
        self._section_label(panel, 'BETTER SWINGSPEED')
        self.swingspeed_toggle = ToggleRow(panel, ['Off', 'On'], 'Off', accent=ACCENT_MAIN, on_change=self._on_swingspeed_toggle)
        self.swingspeed_toggle.pack(fill='x', pady=(4, 4))
        tk.Label(panel, text='hold left click to fire at 10 clicks/sec, stops the instant you let go', font=('Segoe UI', 8), bg=PANEL_BG, fg=TEXT_MUTED, wraplength=400, justify='left').pack(anchor='w', pady=(0, 16))
        self._section_label(panel, 'ALWAYS FEINT')
        self.always_feint_toggle = ToggleRow(panel, ['Off', 'On'], 'Off', accent=ACCENT_MAIN, on_change=self._on_always_feint_toggle)
        self.always_feint_toggle.pack(fill='x', pady=(4, 4))
        tk.Label(panel, text='hold right click to fire at 10 clicks/sec, stops the instant you let go', font=('Segoe UI', 8), bg=PANEL_BG, fg=TEXT_MUTED, wraplength=400, justify='left').pack(anchor='w', pady=(0, 16))
        self._section_label(panel, 'AUTO MANTRA FEINT')
        self.mantra_toggle = ToggleRow(panel, ['Off', 'On'], 'Off', accent=ACCENT_MAIN, on_change=self._on_mantra_toggle)
        self.mantra_toggle.pack(fill='x', pady=(4, 4))
        tk.Label(panel, text='every 3rd left click also fires a right click, at the same time', font=('Segoe UI', 8), bg=PANEL_BG, fg=TEXT_MUTED, wraplength=400, justify='left').pack(anchor='w', pady=(0, 16))
        self._section_label(panel, 'AUTO UPPERCUT')
        self.uppercut_toggle = ToggleRow(panel, ['Off', 'On'], 'Off', accent=ACCENT_MAIN, on_change=self._on_uppercut_toggle)
        self.uppercut_toggle.pack(fill='x', pady=(4, 4))
        tk.Label(panel, text='every left click also presses left-ctrl, then left click again right after', font=('Segoe UI', 8), bg=PANEL_BG, fg=TEXT_MUTED, wraplength=400, justify='left').pack(anchor='w', pady=(0, 4))

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=('Segoe UI', 8, 'bold'), bg=PANEL_BG, fg=TEXT_MUTED).pack(anchor='w', pady=(4, 0))

    def _on_mantra_toggle(self, val):
        self.mantra_feint_enabled = val == 'On'
        self.mantra_left_count = 0

    def _on_uppercut_toggle(self, val):
        self.uppercut_enabled = val == 'On'

    def _on_swingspeed_toggle(self, val):
        self.swingspeed_enabled = val == 'On'
        if not self.swingspeed_enabled:
            self.swingspeed_holding = False

    def _on_always_feint_toggle(self, val):
        self.always_feint_enabled = val == 'On'
        if not self.always_feint_enabled:
            self.feint_holding = False

    def _start_swingspeed_hold(self):
        if self.swingspeed_holding:
            return
        self.swingspeed_holding = True
        threading.Thread(target=self._swingspeed_loop, daemon=True).start()

    def _swingspeed_loop(self):
        while self.swingspeed_holding:
            self._injecting_click = True
            mouse.click(Button.left)
            self._injecting_click = False
            time.sleep(HOLD_INTERVAL)

    def _stop_swingspeed_hold(self):
        self.swingspeed_holding = False

    def _start_feint_hold(self):
        if self.feint_holding:
            return
        self.feint_holding = True
        threading.Thread(target=self._feint_loop, daemon=True).start()

    def _feint_loop(self):
        while self.feint_holding:
            self._injecting_click = True
            mouse.click(Button.right)
            self._injecting_click = False
            time.sleep(HOLD_INTERVAL)

    def _stop_feint_hold(self):
        self.feint_holding = False

    def _start_mouse_listener(self):

        def on_click(x, y, button, pressed):
            if self._injecting_click:
                return
            if button == Button.left:
                if pressed:
                    if self.uppercut_enabled:
                        self._injecting_click = True
                        self.keyboard.press(Key.ctrl_l)
                        mouse.click(Button.left)
                        self.keyboard.release(Key.ctrl_l)
                        self._injecting_click = False
                    if self.mantra_feint_enabled:
                        self.mantra_left_count += 1
                        if self.mantra_left_count % 3 == 0:
                            self._injecting_click = True
                            mouse.click(Button.right)
                            self._injecting_click = False
                    if self.swingspeed_enabled:
                        self._start_swingspeed_hold()
                        return
                else:
                    self._stop_swingspeed_hold()
                    return
                return
            if button == Button.right:
                if pressed:
                    if self.always_feint_enabled:
                        self._start_feint_hold()
                        return
                    return
                else:
                    self._stop_feint_hold()
                    return
                return
        self.mouse_listener = MouseListener(on_click=on_click)
        self.mouse_listener.daemon = True
        self.mouse_listener.start()


if __name__ == '__main__':
    import ctypes
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID('fmlmacro.thefmlmacro.1')
    except Exception:
        pass
    app = TheFMLMacro()
    app.mainloop()
