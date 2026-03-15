#!/usr/bin/env python3
"""
TrackVibe Fitness App - Demo Video Generator
Generates a polished, Facebook-style instructional demo video.
Output: 1080x1920 vertical, 24fps, ~68 seconds.
"""

import math
import os
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ── Dimensions & timing ──────────────────────────────────────────────
W, H = 1080, 1920
FPS = 24
FADE_FRAMES = 24  # 1-second crossfade between scenes

# ── Brand colours ─────────────────────────────────────────────────────
SAGE        = (107, 142, 107)
SAGE_DARK   = (78, 110, 78)
SAGE_LIGHT  = (160, 195, 160)
TERRACOTTA  = (192, 107, 83)
GOLD        = (198, 170, 95)
CHARCOAL    = (38, 42, 51)
STONE       = (120, 125, 140)
MIST        = (242, 243, 246)
WHITE       = (255, 255, 255)
PROTEIN_CLR = (59, 130, 246)
CARBS_CLR   = (212, 175, 55)
FAT_CLR     = (192, 107, 83)
WORKOUT_CLR = (37, 99, 235)
CAL_CLR     = (34, 197, 94)
SLEEP_CLR   = (99, 102, 241)

# ── Paths ─────────────────────────────────────────────────────────────
LOGO_PATH  = "/home/user/BeMe/frontend/public/logo.png"
OUTPUT_PATH = "/home/user/BeMe/trackvibe_demo.mp4"
FONT_PATH  = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD  = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# ── Font cache ────────────────────────────────────────────────────────
_font_cache = {}

def get_font(size, bold=False):
    key = (size, bold)
    if key not in _font_cache:
        path = FONT_BOLD if bold else FONT_PATH
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]

# ── Logo (loaded once) ────────────────────────────────────────────────
_logo_img = None

def get_logo(size=200):
    global _logo_img
    if _logo_img is None or _logo_img.size[0] != size:
        img = Image.open(LOGO_PATH).convert("RGBA")
        img = img.resize((size, size), Image.LANCZOS)
        _logo_img = img
    return _logo_img

# ── Helpers ───────────────────────────────────────────────────────────

def ease_in_out(t):
    """Smooth ease-in-out curve, t in [0,1] -> [0,1]."""
    return t * t * (3 - 2 * t)

def ease_out(t):
    return 1 - (1 - t) ** 3

def lerp(a, b, t):
    return a + (b - a) * t

def color_alpha(base_color, alpha):
    """Return RGBA tuple."""
    return (*base_color, int(alpha * 255))

def gradient_bg(w, h, top_color, bot_color):
    """Create a vertical gradient image."""
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(lerp(top_color[0], bot_color[0], t))
        g = int(lerp(top_color[1], bot_color[1], t))
        b = int(lerp(top_color[2], bot_color[2], t))
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img

_sage_gradient_cache = None

def sage_gradient():
    global _sage_gradient_cache
    if _sage_gradient_cache is None:
        _sage_gradient_cache = gradient_bg(W, H, SAGE_LIGHT, SAGE)
    return _sage_gradient_cache.copy()

_white_img_cache = None

def white_to_sage(t):
    """Blend from white to sage gradient based on t in [0,1]."""
    global _white_img_cache
    if _white_img_cache is None:
        _white_img_cache = Image.new("RGB", (W, H), WHITE)
    sage = sage_gradient()
    return Image.blend(_white_img_cache, sage, t)

def draw_text_centered(draw, text, y, font, fill=CHARCOAL, anchor="mt"):
    draw.text((W // 2, y), text, font=font, fill=fill, anchor=anchor)

def draw_text_left(draw, text, x, y, font, fill=CHARCOAL):
    draw.text((x, y), text, font=font, fill=fill)

def text_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]

def text_height(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]

def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle."""
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def draw_shadow_card(img, box, radius=20, shadow_offset=4, shadow_blur=6,
                     fill=WHITE, outline=None, outline_width=0):
    """Draw a card with a soft drop shadow (optimized: small region blur)."""
    x0, y0, x1, y1 = box
    pad = shadow_blur * 2 + shadow_offset + 4
    # Work on a small cropped region for the blur
    sx0 = max(0, x0 - pad)
    sy0 = max(0, y0 - pad)
    sx1 = min(img.size[0], x1 + pad + shadow_offset)
    sy1 = min(img.size[1], y1 + pad + shadow_offset)
    sw, sh = sx1 - sx0, sy1 - sy0
    shadow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (x0 - sx0 + shadow_offset, y0 - sy0 + shadow_offset,
         x1 - sx0 + shadow_offset, y1 - sy0 + shadow_offset),
        radius=radius, fill=(0, 0, 0, 35)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(shadow_blur))
    # Paste shadow region
    base_region = img.crop((sx0, sy0, sx1, sy1)).convert("RGBA")
    base_region = Image.alpha_composite(base_region, shadow)
    img.paste(base_region.convert("RGB"), (sx0, sy0))
    # Card
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(box, radius=radius, fill=fill)
    if outline:
        d.rounded_rectangle(box, radius=radius, outline=outline, width=outline_width)
    return d

def draw_progress_ring(draw, cx, cy, radius, thickness, progress, color,
                       bg_color=(230, 230, 230), start_angle=-90):
    """Draw a circular progress ring."""
    box = (cx - radius, cy - radius, cx + radius, cy + radius)
    # Background ring
    draw.arc(box, 0, 360, fill=bg_color, width=thickness)
    # Progress arc
    end_angle = start_angle + progress * 360
    if progress > 0:
        draw.arc(box, start_angle, end_angle, fill=color, width=thickness)

def paste_alpha(base, overlay, position):
    """Paste an RGBA image onto an RGB or RGBA base."""
    if overlay.mode == "RGBA":
        base.paste(overlay, position, overlay)
    else:
        base.paste(overlay, position)

# ── Phone frame drawing ──────────────────────────────────────────────

PHONE_X = 90
PHONE_Y = 280
PHONE_W = 900
PHONE_H = 1400
PHONE_R = 40
SCREEN_PAD = 0

def draw_phone_frame(img):
    """Draw a phone mockup frame and return the screen area coords."""
    d = ImageDraw.Draw(img)
    # Phone bezel
    outer = (PHONE_X - 4, PHONE_Y - 4, PHONE_X + PHONE_W + 4, PHONE_Y + PHONE_H + 4)
    d.rounded_rectangle(outer, radius=PHONE_R + 4, fill=CHARCOAL)
    # Screen background
    inner = (PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H)
    d.rounded_rectangle(inner, radius=PHONE_R, fill=WHITE)
    return inner

def draw_status_bar(draw, bg_color=SAGE_DARK):
    """Draw iOS-style status bar."""
    bar = (PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + 44)
    draw.rounded_rectangle(
        (PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + 50),
        radius=PHONE_R, fill=bg_color
    )
    draw.rectangle((PHONE_X, PHONE_Y + 30, PHONE_X + PHONE_W, PHONE_Y + 50), fill=bg_color)
    font = get_font(24, bold=True)
    draw.text((PHONE_X + PHONE_W // 2, PHONE_Y + 14), "9:41",
              font=font, fill=WHITE, anchor="mt")

def draw_bottom_nav(draw, active_idx=0):
    """Draw bottom navigation bar."""
    nav_y = PHONE_Y + PHONE_H - 80
    draw.rectangle((PHONE_X, nav_y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H), fill=WHITE)
    draw.line((PHONE_X, nav_y, PHONE_X + PHONE_W, nav_y), fill=(220, 220, 220), width=1)

    labels = ["Home", "Food", "+", "Goals", "More"]
    icons = ["\u2302", "\u2442", "+", "\u25CE", "\u2026"]  # Unicode placeholders
    slot_w = PHONE_W // 5
    font_icon = get_font(28, bold=True)
    font_label = get_font(16)

    for i, (label, icon) in enumerate(zip(labels, icons)):
        cx = PHONE_X + slot_w * i + slot_w // 2
        is_active = (i == active_idx)
        color = SAGE_DARK if is_active else STONE

        if label == "+":
            # Elevated center button
            draw.ellipse((cx - 28, nav_y - 14, cx + 28, nav_y + 42), fill=SAGE_DARK)
            draw.text((cx, nav_y + 12), "+", font=get_font(32, bold=True),
                      fill=WHITE, anchor="mm")
        else:
            draw.text((cx, nav_y + 18), icon, font=font_icon, fill=color, anchor="mt")
            draw.text((cx, nav_y + 52), label, font=font_label, fill=color, anchor="mt")

def screen_area():
    """Return (x, y, w, h) of usable screen area inside phone."""
    return (PHONE_X + 16, PHONE_Y + 56, PHONE_W - 32, PHONE_H - 140)

# ── Caption bars ──────────────────────────────────────────────────────

def draw_caption_top(img, text, step_num=None):
    """Semi-transparent caption bar at top of frame."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    bar_h = 100
    d.rectangle((0, 0, W, bar_h), fill=(38, 42, 51, 180))
    font = get_font(28, bold=True)
    if step_num:
        # Step circle
        cx = 80
        cy = bar_h // 2
        d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), fill=SAGE)
        d.text((cx, cy), str(step_num), font=get_font(24, bold=True),
               fill=WHITE, anchor="mm")
        d.text((cx + 40, cy), text, font=font, fill=WHITE, anchor="lm")
    else:
        d.text((W // 2, bar_h // 2), text, font=font, fill=WHITE, anchor="mm")
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    return img.convert("RGB")

def draw_caption_bottom(img, text):
    """Semi-transparent caption bar at bottom."""
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    bar_h = 110
    bar_y = H - bar_h
    d.rectangle((0, bar_y, W, H), fill=(38, 42, 51, 180))
    font = get_font(26)
    # Word wrap
    words = text.split()
    lines = []
    line = ""
    for word in words:
        test = line + (" " if line else "") + word
        if text_width(d, test, font) > W - 80:
            lines.append(line)
            line = word
        else:
            line = test
    if line:
        lines.append(line)
    total_h = len(lines) * 36
    y = bar_y + (bar_h - total_h) // 2
    for l in lines:
        d.text((W // 2, y), l, font=font, fill=WHITE, anchor="mt")
        y += 36
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    return img.convert("RGB")

# ── Scene generators ──────────────────────────────────────────────────
# Each returns a list of PIL Image frames.

def scene_1_welcome():
    """Welcome scene: 6 seconds = 144 frames."""
    n = 144
    frames = []
    logo = get_logo(200)

    for i in range(n):
        t = i / (n - 1)
        # Background: fade from white to sage gradient
        bg_t = ease_in_out(min(t / 0.3, 1.0))
        img = white_to_sage(bg_t)
        draw = ImageDraw.Draw(img)

        # Logo fade-in (frames 18-54)
        logo_t = ease_in_out(max(0, min((t - 0.12) / 0.25, 1.0)))
        if logo_t > 0:
            logo_alpha = Image.new("RGBA", img.size, (0, 0, 0, 0))
            temp_logo = logo.copy()
            # Modulate alpha
            r, g, b, a = temp_logo.split()
            a = a.point(lambda p: int(p * logo_t))
            temp_logo = Image.merge("RGBA", (r, g, b, a))
            logo_alpha.paste(temp_logo, (W // 2 - 100, H // 2 - 240), temp_logo)
            img = Image.alpha_composite(img.convert("RGBA"), logo_alpha).convert("RGB")
            draw = ImageDraw.Draw(img)

        # Title fade-in
        title_t = ease_in_out(max(0, min((t - 0.35) / 0.2, 1.0)))
        if title_t > 0:
            font = get_font(44, bold=True)
            alpha = int(title_t * 255)
            draw.text((W // 2, H // 2 + 10), "Your Personal Fitness",
                      font=font, fill=(*CHARCOAL, alpha) if img.mode == "RGBA" else CHARCOAL,
                      anchor="mt")
            draw.text((W // 2, H // 2 + 65), "Companion",
                      font=font, fill=CHARCOAL, anchor="mt")

        # Subtitle fade-in
        sub_t = ease_in_out(max(0, min((t - 0.55) / 0.2, 1.0)))
        if sub_t > 0:
            font = get_font(30)
            draw.text((W // 2, H // 2 + 140), "Here's how to get started",
                      font=font, fill=STONE, anchor="mt")

        frames.append(img)
    return frames


def _draw_dashboard_content(draw, img, cal_progress, prot_val, carb_val, fat_val,
                            cal_val=1240, highlight_ring=0.0):
    """Draw the dashboard screen content inside the phone."""
    sx, sy, sw, sh = screen_area()

    # "Today" header
    font_h = get_font(36, bold=True)
    draw.text((sx + 10, sy + 10), "Today", font=font_h, fill=CHARCOAL)
    date_font = get_font(20)
    draw.text((sx + sw - 10, sy + 18), "Mar 11, 2026", font=date_font, fill=STONE, anchor="rt")

    # Calorie ring
    ring_cx = PHONE_X + PHONE_W // 2
    ring_cy = sy + 220
    ring_r = 110
    ring_thick = 16

    # Highlight glow
    if highlight_ring > 0:
        glow_r = ring_r + 8 + int(highlight_ring * 6)
        glow_alpha = int(highlight_ring * 60)
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse((ring_cx - glow_r, ring_cy - glow_r,
                     ring_cx + glow_r, ring_cy + glow_r),
                    outline=(*SAGE_LIGHT, glow_alpha), width=4)
        img_rgba = img.convert("RGBA")
        img_rgba = Image.alpha_composite(img_rgba, overlay)
        img.paste(img_rgba.convert("RGB"))
        draw = ImageDraw.Draw(img)

    draw_progress_ring(draw, ring_cx, ring_cy, ring_r, ring_thick,
                       cal_progress, CAL_CLR, bg_color=(230, 235, 230))
    # Center text
    cal_font = get_font(48, bold=True)
    draw.text((ring_cx, ring_cy - 16), str(cal_val), font=cal_font,
              fill=CHARCOAL, anchor="mm")
    sub_font = get_font(20)
    draw.text((ring_cx, ring_cy + 24), "of 2,000 cal", font=sub_font,
              fill=STONE, anchor="mm")

    # Macro circles
    macros = [
        ("Protein", prot_val, 120, PROTEIN_CLR),
        ("Carbs", carb_val, 250, CARBS_CLR),
        ("Fat", fat_val, 65, FAT_CLR),
    ]
    macro_y = sy + 400
    for idx, (name, val, goal, color) in enumerate(macros):
        cx = sx + sw // 6 + idx * (sw // 3)
        r = 48
        progress = min(val / goal, 1.0)
        draw_progress_ring(draw, cx, macro_y, r, 10, progress, color)
        vfont = get_font(24, bold=True)
        draw.text((cx, macro_y - 6), f"{val}g", font=vfont, fill=CHARCOAL, anchor="mm")
        lfont = get_font(16)
        draw.text((cx, macro_y + 18), f"/{goal}g", font=lfont, fill=STONE, anchor="mm")
        nfont = get_font(18, bold=True)
        draw.text((cx, macro_y + r + 20), name, font=nfont, fill=CHARCOAL, anchor="mt")

    return draw


def scene_2_dashboard():
    """Dashboard tour: 8s = 192 frames."""
    n = 192
    frames = []
    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)

        # Animate calorie ring filling
        fill_t = ease_out(min(t / 0.4, 1.0))
        cal_prog = 0.62 * fill_t  # 1240/2000

        # Highlight pulse
        pulse = 0
        if 0.5 < t < 0.8:
            pt = (t - 0.5) / 0.3
            pulse = math.sin(pt * math.pi * 2) * 0.5 + 0.5

        _draw_dashboard_content(draw, img, cal_prog,
                                int(45 * fill_t), int(156 * fill_t), int(38 * fill_t),
                                cal_val=int(1240 * fill_t), highlight_ring=pulse)
        draw_bottom_nav(draw, active_idx=0)

        # Captions
        cap_t = ease_in_out(min(t / 0.2, 1.0))
        if cap_t > 0.01:
            img = draw_caption_top(img, "YOUR DASHBOARD")
            img = draw_caption_bottom(img,
                "Track calories, macros, and goals \u2014 all in one place.")

        frames.append(img)
    return frames


def scene_3_adding_food():
    """Adding food: 10s = 240 frames."""
    n = 240
    frames = []

    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)
        sx, sy, sw, sh = screen_area()

        # Phase 1: Show search/form (0-0.6)
        # Phase 2: Show food card in feed (0.6-1.0)
        if t < 0.6:
            form_t = ease_in_out(min(t / 0.15, 1.0))
            # Header
            font_h = get_font(32, bold=True)
            draw.text((sx + sw // 2, sy + 16), "Add Food Entry",
                      font=font_h, fill=CHARCOAL, anchor="mt")

            # Search field
            field_y = sy + 70
            rounded_rect(draw, (sx + 10, field_y, sx + sw - 10, field_y + 50),
                         12, fill=(245, 245, 248), outline=(200, 200, 205))
            search_font = get_font(22)

            # Typing animation
            typed_text = "chicken breast"
            chars = int(len(typed_text) * min(t / 0.2, 1.0))
            draw.text((sx + 30, field_y + 13), typed_text[:chars],
                      font=search_font, fill=CHARCOAL)
            if chars < len(typed_text):
                # Cursor blink
                if int(t * 8) % 2 == 0:
                    cursor_x = sx + 30 + text_width(draw, typed_text[:chars], search_font)
                    draw.line((cursor_x + 2, field_y + 10, cursor_x + 2, field_y + 40),
                              fill=SAGE_DARK, width=2)

            # Search result dropdown (after typing done)
            if t > 0.2:
                drop_t = ease_in_out(min((t - 0.2) / 0.1, 1.0))
                drop_y = field_y + 56
                drop_h = int(50 * drop_t)
                if drop_h > 5:
                    rounded_rect(draw, (sx + 10, drop_y, sx + sw - 10, drop_y + drop_h),
                                 8, fill=WHITE, outline=(220, 220, 225))
                    if drop_h > 30:
                        rf = get_font(20)
                        draw.text((sx + 30, drop_y + 14),
                                  "Chicken Breast \u2014 165 cal/100g",
                                  font=rf, fill=CHARCOAL)

            # Form fields (after 0.3)
            if t > 0.3:
                form_show = ease_in_out(min((t - 0.3) / 0.15, 1.0))
                fy = field_y + 120
                fields = [
                    ("Name", "Grilled Chicken Breast"),
                    ("Calories", "330"),
                    ("Protein", "62g"),
                    ("Carbs", "0g"),
                    ("Fat", "7g"),
                ]
                label_font = get_font(18, bold=True)
                val_font = get_font(22)
                for idx, (label, value) in enumerate(fields):
                    row_y = fy + idx * 62
                    if row_y > sy + sh - 120:
                        break
                    alpha_offset = int(form_show * 255)
                    draw.text((sx + 20, row_y), label, font=label_font, fill=STONE)
                    rounded_rect(draw, (sx + 10, row_y + 24, sx + sw - 10, row_y + 54),
                                 8, fill=(248, 248, 250), outline=(210, 210, 215))
                    draw.text((sx + 24, row_y + 28), value, font=val_font, fill=CHARCOAL)

                # Add button
                if t > 0.4:
                    btn_t = ease_in_out(min((t - 0.4) / 0.1, 1.0))
                    btn_y = fy + len(fields) * 62 + 10
                    btn_color = SAGE_DARK
                    # Highlight pulse
                    if 0.45 < t < 0.58:
                        pulse = math.sin((t - 0.45) / 0.13 * math.pi) * 0.3
                        btn_color = tuple(min(255, int(c + pulse * 60)) for c in SAGE_DARK)
                    rounded_rect(draw, (sx + sw // 4, btn_y, sx + 3 * sw // 4, btn_y + 52),
                                 26, fill=btn_color)
                    btn_font = get_font(24, bold=True)
                    draw.text((sx + sw // 2, btn_y + 26), "Add Food",
                              font=btn_font, fill=WHITE, anchor="mm")
        else:
            # Phase 2: food card in feed
            card_t = ease_out(min((t - 0.6) / 0.15, 1.0))
            font_h = get_font(32, bold=True)
            draw.text((sx + 10, sy + 16), "Today", font=font_h, fill=CHARCOAL)

            # Slide-in card
            card_x0 = sx + 10
            card_y0 = int(sy + 70 + (1 - card_t) * 40)
            card_x1 = sx + sw - 10
            card_y1 = card_y0 + 90
            draw_shadow_card(img, (card_x0, card_y0, card_x1, card_y1), radius=16)
            draw = ImageDraw.Draw(img)

            # Food icon circle
            ic_cx = card_x0 + 45
            ic_cy = (card_y0 + card_y1) // 2
            draw.ellipse((ic_cx - 26, ic_cy - 26, ic_cx + 26, ic_cy + 26), fill=SAGE_LIGHT)
            draw.text((ic_cx, ic_cy), "\U0001F357", font=get_font(24), anchor="mm")

            # Text
            nf = get_font(22, bold=True)
            draw.text((card_x0 + 85, card_y0 + 16), "Grilled Chicken Breast",
                      font=nf, fill=CHARCOAL)
            sf = get_font(18)
            draw.text((card_x0 + 85, card_y0 + 46), "200g", font=sf, fill=STONE)
            # Calorie badge
            cf = get_font(22, bold=True)
            draw.text((card_x1 - 20, (card_y0 + card_y1) // 2), "330 cal",
                      font=cf, fill=SAGE_DARK, anchor="rm")

        draw_bottom_nav(ImageDraw.Draw(img), active_idx=1)

        # Captions
        if t < 0.6:
            img = draw_caption_top(img, "LOG YOUR MEALS", step_num=1)
            img = draw_caption_bottom(img,
                "Search from thousands of foods, or add your own.")
        else:
            img = draw_caption_top(img, "LOG YOUR MEALS", step_num=1)
            img = draw_caption_bottom(img, "Your food appears instantly in the feed.")

        frames.append(img)
    return frames


def scene_4_tracking_macros():
    """Tracking macros: 8s = 192 frames."""
    n = 192
    frames = []
    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)

        # Animate macro updates
        anim_t = ease_out(min(t / 0.5, 1.0))
        prot = int(lerp(45, 107, anim_t))
        carbs = 156
        fat = int(lerp(38, 45, anim_t))
        cal = int(lerp(1240, 1570, anim_t))
        cal_prog = cal / 2000.0

        _draw_dashboard_content(draw, img, cal_prog, prot, carbs, fat, cal_val=cal)
        draw_bottom_nav(draw, active_idx=0)

        img = draw_caption_top(img, "WATCH YOUR MACROS", step_num=2)
        img = draw_caption_bottom(img,
            "Every meal updates your daily progress in real-time.")
        frames.append(img)
    return frames


def scene_5_logging_workout():
    """Logging a workout: 10s = 240 frames."""
    n = 240
    frames = []
    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)
        sx, sy, sw, sh = screen_area()

        if t < 0.65:
            # Workout form
            form_t = ease_in_out(min(t / 0.15, 1.0))
            font_h = get_font(32, bold=True)
            draw.text((sx + sw // 2, sy + 16), "Add Workout",
                      font=font_h, fill=CHARCOAL, anchor="mt")

            fy = sy + 70
            fields = [
                ("Title", "Push Day"),
                ("Type", "Strength"),
                ("Duration", "45 min"),
            ]
            label_font = get_font(18, bold=True)
            val_font = get_font(22)
            for idx, (label, value) in enumerate(fields):
                row_y = fy + idx * 62
                draw.text((sx + 20, row_y), label, font=label_font, fill=STONE)
                rounded_rect(draw, (sx + 10, row_y + 24, sx + sw - 10, row_y + 54),
                             8, fill=(248, 248, 250), outline=(210, 210, 215))
                draw.text((sx + 24, row_y + 28), value, font=val_font, fill=CHARCOAL)

            # Exercises section
            ex_y = fy + len(fields) * 62 + 20
            draw.text((sx + 20, ex_y), "Exercises", font=get_font(22, bold=True),
                      fill=CHARCOAL)

            exercises = [
                ("Bench Press", "4 sets", "8 reps", "80 kg"),
                ("Incline DB Press", "3 sets", "10 reps", "30 kg"),
            ]
            ef = get_font(20, bold=True)
            df = get_font(17)
            for idx, (name, sets, reps, weight) in enumerate(exercises):
                ey = ex_y + 40 + idx * 80
                # Exercise card
                draw_shadow_card(img, (sx + 10, ey, sx + sw - 10, ey + 70), radius=12)
                draw = ImageDraw.Draw(img)
                draw.text((sx + 30, ey + 12), name, font=ef, fill=CHARCOAL)
                detail = f"{sets}  \u00B7  {reps}  \u00B7  {weight}"
                draw.text((sx + 30, ey + 40), detail, font=df, fill=STONE)

            # Add button
            if t > 0.3:
                btn_y = ex_y + 40 + len(exercises) * 80 + 20
                btn_color = SAGE_DARK
                if 0.4 < t < 0.55:
                    pulse = math.sin((t - 0.4) / 0.15 * math.pi) * 0.3
                    btn_color = tuple(min(255, int(c + pulse * 60)) for c in SAGE_DARK)
                rounded_rect(draw, (sx + sw // 4, btn_y, sx + 3 * sw // 4, btn_y + 52),
                             26, fill=btn_color)
                draw.text((sx + sw // 2, btn_y + 26), "Add Workout",
                          font=get_font(24, bold=True), fill=WHITE, anchor="mm")
        else:
            # Workout card in feed
            card_t = ease_out(min((t - 0.65) / 0.15, 1.0))
            font_h = get_font(32, bold=True)
            draw.text((sx + 10, sy + 16), "Workouts", font=font_h, fill=CHARCOAL)

            card_y0 = int(sy + 70 + (1 - card_t) * 40)
            draw_shadow_card(img, (sx + 10, card_y0, sx + sw - 10, card_y0 + 170), radius=16)
            draw = ImageDraw.Draw(img)

            # Workout icon
            draw.ellipse((sx + 25, card_y0 + 15, sx + 75, card_y0 + 65), fill=WORKOUT_CLR)
            draw.text((sx + 50, card_y0 + 40), "\u26A1",
                      font=get_font(24), fill=WHITE, anchor="mm")

            nf = get_font(24, bold=True)
            draw.text((sx + 90, card_y0 + 18), "Push Day", font=nf, fill=CHARCOAL)
            sf = get_font(18)
            draw.text((sx + 90, card_y0 + 50), "Strength \u00B7 45 min",
                      font=sf, fill=STONE)

            # Mini exercise list
            exf = get_font(18)
            draw.text((sx + 40, card_y0 + 90), "Bench Press", font=exf, fill=CHARCOAL)
            draw.text((sx + sw - 30, card_y0 + 90), "4 \u00D7 8",
                      font=exf, fill=STONE, anchor="rt")
            draw.text((sx + 40, card_y0 + 118), "Incline DB Press", font=exf, fill=CHARCOAL)
            draw.text((sx + sw - 30, card_y0 + 118), "3 \u00D7 10",
                      font=exf, fill=STONE, anchor="rt")

        draw_bottom_nav(ImageDraw.Draw(img), active_idx=0)
        img = draw_caption_top(img, "LOG YOUR WORKOUTS", step_num=3)
        img = draw_caption_bottom(img,
            "Track every set, rep, and weight for any exercise.")
        frames.append(img)
    return frames


def scene_6_voice_input():
    """Voice input: 8s = 192 frames."""
    n = 192
    frames = []
    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)
        sx, sy, sw, sh = screen_area()

        cx = PHONE_X + PHONE_W // 2
        mic_cy = sy + 200

        if t < 0.45:
            # Mic button with pulse rings
            phase_t = t / 0.45

            # Pulse rings
            for ring_i in range(3):
                ring_phase = (phase_t * 2 + ring_i * 0.3) % 1.0
                ring_r = 60 + ring_phase * 80
                ring_alpha = int((1 - ring_phase) * 100)
                overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                od = ImageDraw.Draw(overlay)
                od.ellipse((cx - ring_r, mic_cy - ring_r,
                            cx + ring_r, mic_cy + ring_r),
                           outline=(*SAGE_LIGHT, ring_alpha), width=3)
                img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
                draw = ImageDraw.Draw(img)

            # Mic button
            draw.ellipse((cx - 50, mic_cy - 50, cx + 50, mic_cy + 50), fill=SAGE_DARK)
            draw.text((cx, mic_cy), "\U0001F3A4", font=get_font(36), anchor="mm")

            # Speech bubble
            if t > 0.15:
                bub_t = ease_in_out(min((t - 0.15) / 0.15, 1.0))
                bub_y = mic_cy + 90
                bub_w = int(sw * 0.85 * bub_t)
                if bub_w > 80:
                    bub_x0 = cx - bub_w // 2
                    bub_x1 = cx + bub_w // 2
                    rounded_rect(draw, (bub_x0, bub_y, bub_x1, bub_y + 60),
                                 16, fill=WHITE, outline=(210, 210, 215))
                    if bub_t > 0.8:
                        speech = '"I had oatmeal and a banana for breakfast"'
                        sf = get_font(18)
                        draw.text((cx, bub_y + 30), speech,
                                  font=sf, fill=CHARCOAL, anchor="mm")

        elif t < 0.6:
            # Processing
            draw.ellipse((cx - 50, mic_cy - 50, cx + 50, mic_cy + 50), fill=SAGE_DARK)
            draw.text((cx, mic_cy), "\U0001F3A4", font=get_font(36), anchor="mm")
            # Spinner dots
            spinner_t = (t - 0.45) / 0.15
            for dot_i in range(3):
                dot_alpha = abs(math.sin((spinner_t * 4 + dot_i * 0.8) * math.pi))
                dot_r = 6
                dot_x = cx - 30 + dot_i * 30
                dot_y = mic_cy + 100
                gray = int(lerp(200, 80, dot_alpha))
                draw.ellipse((dot_x - dot_r, dot_y - dot_r,
                              dot_x + dot_r, dot_y + dot_r),
                             fill=(gray, gray, gray))
            pf = get_font(20)
            draw.text((cx, mic_cy + 130), "Processing...", font=pf,
                      fill=STONE, anchor="mt")
        else:
            # Result cards
            result_t = ease_out(min((t - 0.6) / 0.2, 1.0))

            # Small mic at top
            draw.ellipse((cx - 30, sy + 20, cx + 30, sy + 80), fill=SAGE_LIGHT)
            draw.text((cx, sy + 50), "\U0001F3A4", font=get_font(20), anchor="mm")

            cards = [
                ("Oatmeal", "300 cal"),
                ("Banana", "105 cal"),
            ]
            for ci, (name, cals) in enumerate(cards):
                card_y = int(sy + 110 + ci * 100 + (1 - result_t) * 30)
                draw_shadow_card(img, (sx + 20, card_y, sx + sw - 20, card_y + 80), radius=14)
                draw = ImageDraw.Draw(img)
                # Icon
                icon_cx = sx + 60
                icon_cy = card_y + 40
                draw.ellipse((icon_cx - 22, icon_cy - 22, icon_cx + 22, icon_cy + 22),
                             fill=SAGE_LIGHT)
                nf = get_font(22, bold=True)
                draw.text((sx + 100, card_y + 20), name, font=nf, fill=CHARCOAL)
                cf = get_font(20, bold=True)
                draw.text((sx + sw - 40, card_y + 40), cals,
                          font=cf, fill=SAGE_DARK, anchor="rm")
                check_font = get_font(22, bold=True)
                draw.text((sx + sw - 40, card_y + 20), "\u2713",
                          font=check_font, fill=CAL_CLR, anchor="rm")

        draw_bottom_nav(ImageDraw.Draw(img), active_idx=1)
        img = draw_caption_top(img, "USE YOUR VOICE", step_num=4)
        img = draw_caption_bottom(img, "Just say what you ate. TrackVibe handles the rest.")
        frames.append(img)
    return frames


def scene_7_goals():
    """Goals & Progress: 8s = 192 frames."""
    n = 192
    frames = []
    for i in range(n):
        t = i / (n - 1)
        img = Image.new("RGB", (W, H), MIST)
        draw_phone_frame(img)
        draw = ImageDraw.Draw(img)
        draw_status_bar(draw)
        sx, sy, sw, sh = screen_area()

        font_h = get_font(32, bold=True)
        draw.text((sx + 10, sy + 16), "Goals & Progress",
                  font=font_h, fill=CHARCOAL)

        anim_t = ease_out(min(t / 0.45, 1.0))

        goals = [
            ("Workouts", "2/3 this week", 0.66, WORKOUT_CLR),
            ("Calories", "1,570/2,000 today", 0.78, CAL_CLR),
            ("Sleep", "7.2h / 8h", 0.90, SLEEP_CLR),
        ]

        for gi, (name, detail, target_progress, color) in enumerate(goals):
            card_y = sy + 80 + gi * 150
            draw_shadow_card(img, (sx + 10, card_y, sx + sw - 10, card_y + 130), radius=16)
            draw = ImageDraw.Draw(img)

            # Ring
            ring_cx = sx + 80
            ring_cy = card_y + 65
            progress = target_progress * anim_t
            draw_progress_ring(draw, ring_cx, ring_cy, 40, 10, progress, color)
            pct = int(progress * 100)
            draw.text((ring_cx, ring_cy), f"{pct}%",
                      font=get_font(20, bold=True), fill=CHARCOAL, anchor="mm")

            # Text
            nf = get_font(24, bold=True)
            draw.text((sx + 140, card_y + 30), name, font=nf, fill=CHARCOAL)
            df = get_font(18)
            draw.text((sx + 140, card_y + 62), detail, font=df, fill=STONE)
            # Progress bar
            bar_y = card_y + 95
            bar_w = sw - 170
            rounded_rect(draw, (sx + 140, bar_y, sx + 140 + bar_w, bar_y + 10),
                         5, fill=(230, 230, 235))
            fill_w = int(bar_w * progress)
            if fill_w > 5:
                rounded_rect(draw, (sx + 140, bar_y, sx + 140 + fill_w, bar_y + 10),
                             5, fill=color)

        # Mini weekly chart
        if t > 0.4:
            chart_t = ease_in_out(min((t - 0.4) / 0.2, 1.0))
            chart_y = sy + 80 + 3 * 150 + 20
            chart_h = 100
            if chart_y + chart_h < sy + sh - 10:
                draw.text((sx + 20, chart_y), "This Week",
                          font=get_font(20, bold=True), fill=CHARCOAL)
                days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                values = [0.6, 0.8, 0.5, 0.9, 0.7, 0.3, 0.0]
                bar_area_y = chart_y + 30
                bar_max_h = 60
                bar_w_each = (sw - 60) // 7
                for di, (day, val) in enumerate(zip(days, values)):
                    bx = sx + 30 + di * bar_w_each
                    bh = int(bar_max_h * val * chart_t)
                    if bh > 3:
                        rounded_rect(draw,
                            (bx, bar_area_y + bar_max_h - bh,
                             bx + bar_w_each - 10, bar_area_y + bar_max_h),
                            4, fill=SAGE)
                    draw.text((bx + (bar_w_each - 10) // 2, bar_area_y + bar_max_h + 6),
                              day, font=get_font(14), fill=STONE, anchor="mt")

        draw_bottom_nav(ImageDraw.Draw(img), active_idx=3)
        img = draw_caption_top(img, "SET GOALS & TRACK PROGRESS", step_num=5)
        img = draw_caption_bottom(img,
            "Set daily or weekly goals. Stay consistent. See results.")
        frames.append(img)
    return frames


def scene_8_outro():
    """Outro: 8s = 192 frames."""
    n = 192
    frames = []
    logo = get_logo(200)

    for i in range(n):
        t = i / (n - 1)
        img = sage_gradient()
        draw = ImageDraw.Draw(img)

        # Logo
        logo_t = ease_in_out(min(t / 0.25, 1.0))
        if logo_t > 0:
            logo_alpha = Image.new("RGBA", img.size, (0, 0, 0, 0))
            temp_logo = logo.copy()
            r, g, b, a = temp_logo.split()
            a = a.point(lambda p: int(p * logo_t))
            temp_logo = Image.merge("RGBA", (r, g, b, a))
            logo_alpha.paste(temp_logo, (W // 2 - 100, H // 2 - 280), temp_logo)
            img = Image.alpha_composite(img.convert("RGBA"), logo_alpha).convert("RGB")
            draw = ImageDraw.Draw(img)

        # Text fade-ins
        t1 = ease_in_out(max(0, min((t - 0.2) / 0.15, 1.0)))
        if t1 > 0:
            draw.text((W // 2, H // 2 - 30), "Start your journey today.",
                      font=get_font(42, bold=True), fill=CHARCOAL, anchor="mt")

        t2 = ease_in_out(max(0, min((t - 0.35) / 0.15, 1.0)))
        if t2 > 0:
            draw.text((W // 2, H // 2 + 40), "Track. Balance. Thrive.",
                      font=get_font(30), fill=STONE, anchor="mt")

        # CTA button
        t3 = ease_in_out(max(0, min((t - 0.5) / 0.15, 1.0)))
        if t3 > 0:
            btn_w = 320
            btn_h = 60
            btn_x = W // 2 - btn_w // 2
            btn_y = H // 2 + 110
            rounded_rect(draw, (btn_x, btn_y, btn_x + btn_w, btn_y + btn_h),
                         30, fill=SAGE_DARK)
            draw.text((W // 2, btn_y + btn_h // 2), "Download TrackVibe",
                      font=get_font(26, bold=True), fill=WHITE, anchor="mm")

        # Fade to white at end
        if t > 0.85:
            fade_t = (t - 0.85) / 0.15
            white_img = Image.new("RGB", (W, H), WHITE)
            img = Image.blend(img, white_img, fade_t)

        frames.append(img)
    return frames


# ── Audio generation ──────────────────────────────────────────────────

def generate_audio(total_frames, scene_boundaries):
    """Generate calm background audio with transition dings."""
    duration = total_frames / FPS
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples, dtype=np.float64)

    # Ambient pad: soft C major chord (C3, E3, G3)
    pad = np.zeros(num_samples, dtype=np.float64)
    freqs = [130.81, 164.81, 196.00]  # C3, E3, G3
    for f in freqs:
        pad += 0.04 * np.sin(2 * np.pi * f * t)
    # Slow volume swell
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)
    pad *= envelope

    # Add gentle high pad (octave up, quieter)
    for f in [261.63, 329.63, 392.00]:
        pad += 0.015 * np.sin(2 * np.pi * f * t)

    audio = pad.copy()

    # Transition dings at scene boundaries
    for boundary_frame in scene_boundaries:
        ding_time = boundary_frame / FPS
        ding_duration = 0.4
        ding_freq = 880  # A5
        mask = (t >= ding_time) & (t < ding_time + ding_duration)
        ding_t = t[mask] - ding_time
        ding = 0.08 * np.sin(2 * np.pi * ding_freq * ding_t)
        ding *= np.exp(-ding_t * 8)  # Fast decay
        # Add a second harmonic
        ding += 0.03 * np.sin(2 * np.pi * ding_freq * 2 * ding_t) * np.exp(-ding_t * 10)
        audio[mask] += ding

    # Soft whoosh transitions (filtered noise)
    for boundary_frame in scene_boundaries:
        whoosh_time = boundary_frame / FPS - 0.3
        whoosh_dur = 0.6
        mask = (t >= whoosh_time) & (t < whoosh_time + whoosh_dur)
        if np.sum(mask) > 0:
            noise = np.random.randn(np.sum(mask)) * 0.015
            whoosh_t = t[mask] - whoosh_time
            whoosh_env = np.sin(np.pi * whoosh_t / whoosh_dur)
            audio[mask] += noise * whoosh_env

    # Fade in/out
    fade_samples = int(1.0 * sample_rate)
    audio[:fade_samples] *= np.linspace(0, 1, fade_samples)
    audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.6

    # Convert to 16-bit PCM
    audio_int = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
    return audio_int, sample_rate


# ── Streaming frame generator with crossfade ─────────────────────────

def generate_single_frame(scene_func, frame_idx, total_scene_frames):
    """Generate a single frame from a scene function.

    Scene functions accept (frame_index, total_frames) when called with
    the _single_frame protocol, but our existing functions generate all
    frames at once.  We keep a small cache per scene to avoid regenerating.
    """
    # This is handled differently - we generate frames in small batches
    pass


def iter_all_frames(scene_generators, fade_n=FADE_FRAMES):
    """Yield frames one at a time with crossfade, keeping memory low.

    Strategy: generate one scene at a time, keep only the tail of the
    previous scene (for crossfade) in memory.
    """
    prev_tail = []  # last fade_n frames of previous scene
    total_yielded = 0

    for scene_idx, (name, gen_func) in enumerate(scene_generators):
        print(f"  Rendering {name}...", end=" ", flush=True)
        frames = gen_func()
        print(f"{len(frames)} frames", flush=True)

        if scene_idx == 0:
            # First scene: yield all but last fade_n frames, keep tail
            main_end = len(frames) - fade_n
            for f in frames[:main_end]:
                yield f
                total_yielded += 1
            prev_tail = frames[main_end:]
        else:
            # Crossfade prev_tail with first fade_n frames of this scene
            overlap = min(fade_n, len(prev_tail), len(frames))
            for j in range(overlap):
                alpha = (j + 1) / (overlap + 1)
                blended = Image.blend(prev_tail[j], frames[j], alpha)
                yield blended
                total_yielded += 1

            # Yield remaining frames of this scene except last fade_n
            # (unless this is the last scene)
            if scene_idx < len(scene_generators) - 1:
                main_end = len(frames) - fade_n
                for f in frames[overlap:main_end]:
                    yield f
                    total_yielded += 1
                prev_tail = frames[main_end:]
            else:
                # Last scene: yield everything remaining
                for f in frames[overlap:]:
                    yield f
                    total_yielded += 1
                prev_tail = []

        # Free scene frames
        del frames

    print(f"  Total frames yielded: {total_yielded}")


# ── Main ──────────────────────────────────────────────────────────────

def main():
    print("Generating TrackVibe demo video...")
    print(f"Resolution: {W}x{H}, FPS: {FPS}")
    print()

    scene_generators = [
        ("Scene 1: Welcome", scene_1_welcome),
        ("Scene 2: Dashboard Tour", scene_2_dashboard),
        ("Scene 3: Adding Food", scene_3_adding_food),
        ("Scene 4: Tracking Macros", scene_4_tracking_macros),
        ("Scene 5: Logging Workout", scene_5_logging_workout),
        ("Scene 6: Voice Input", scene_6_voice_input),
        ("Scene 7: Goals & Progress", scene_7_goals),
        ("Scene 8: Outro", scene_8_outro),
    ]

    # Calculate total frames and scene boundaries for audio
    scene_frame_counts = [144, 192, 240, 192, 240, 192, 192, 192]
    total_frames = sum(scene_frame_counts) - FADE_FRAMES * (len(scene_frame_counts) - 1)
    duration = total_frames / FPS

    boundaries = []
    cumulative = 0
    for count in scene_frame_counts[:-1]:
        cumulative += count - FADE_FRAMES
        boundaries.append(cumulative)

    # Generate audio first
    print("  Generating audio...", flush=True)
    audio_data, sample_rate = generate_audio(total_frames, boundaries)

    with tempfile.TemporaryDirectory() as tmpdir:
        audio_path = os.path.join(tmpdir, "audio.wav")
        with wave.open(audio_path, "w") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(audio_data.tobytes())
        del audio_data

        print("\n  Encoding video with ffmpeg...", flush=True)
        cmd = [
            "ffmpeg", "-y",
            "-f", "rawvideo",
            "-vcodec", "rawvideo",
            "-s", f"{W}x{H}",
            "-pix_fmt", "rgb24",
            "-r", str(FPS),
            "-i", "pipe:0",
            "-i", audio_path,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-shortest",
            "-movflags", "+faststart",
            OUTPUT_PATH,
        ]

        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        frame_count = 0
        for frame in iter_all_frames(scene_generators):
            if frame_count % 48 == 0:
                pct = frame_count / total_frames * 100
                print(f"\r    Encoding: {pct:.0f}%  ({frame_count}/{total_frames})",
                      end="", flush=True)
            rgb = frame.convert("RGB")
            proc.stdin.write(rgb.tobytes())
            frame_count += 1

        proc.stdin.close()
        # Read any remaining stderr then wait
        stderr_out = b""
        if proc.stderr:
            stderr_out = proc.stderr.read()
        if proc.stdout:
            proc.stdout.read()
        proc.wait()
        print(f"\r    Encoding: 100%  ({frame_count} frames)    ")

        if proc.returncode != 0:
            print(f"\nffmpeg error:\n{stderr_out.decode()}")
            sys.exit(1)

    actual_duration = frame_count / FPS
    print(f"\n  Video saved to: {OUTPUT_PATH}")
    print(f"  Duration: {actual_duration:.1f}s")
    print(f"  File size: {os.path.getsize(OUTPUT_PATH) / 1024 / 1024:.1f} MB")
    print("\nDone!")


if __name__ == "__main__":
    main()
