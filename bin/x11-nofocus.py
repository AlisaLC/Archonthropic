#!/usr/bin/env python3
"""Mark an X11 window as never taking keyboard focus (ICCCM WM_HINTS input = False).

Usage: x11-nofocus.py <window id>. main.js runs this on the companion strip; see refuseFocus() there.
"""
import ctypes
import sys

c_long, c_int, c_ulong = ctypes.c_long, ctypes.c_int, ctypes.c_ulong


class XWMHints(ctypes.Structure):
    _fields_ = [('flags', c_long), ('input', c_int), ('initial_state', c_int), ('icon_pixmap', c_ulong),
                ('icon_window', c_ulong), ('icon_x', c_int), ('icon_y', c_int), ('icon_mask', c_ulong),
                ('window_group', c_ulong)]


INPUT_HINT = 1

x11 = ctypes.cdll.LoadLibrary('libX11.so.6')
x11.XOpenDisplay.restype = ctypes.c_void_p
display = x11.XOpenDisplay(None)
if not display:
    sys.exit('cannot open X display')
hints = XWMHints(flags=INPUT_HINT, input=0)
x11.XSetWMHints(ctypes.c_void_p(display), c_ulong(int(sys.argv[1], 0)), ctypes.byref(hints))
x11.XFlush(ctypes.c_void_p(display))
x11.XCloseDisplay(ctypes.c_void_p(display))
