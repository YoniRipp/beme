#!/usr/bin/env python3
"""
TrackVibe YouTube Poop Marketing Video Generator
============================================
Generates a ~35s vertical (1080x1920) YTP-style video expressing
what it's like to be a TrackVibe fitness tracker user.

Usage: python generate_ytp_video.py
Output: trackvibe_ytp.mp4
"""

import os
import sys
import math
import random
import struct
import shutil
import tempfile
import subprocess
import wave
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops

# ─── CONSTANTS ───────────────────────────────────────────────────────────────
W, H = 1080, 1920
FPS = 24
SCRIPT_DIR = Path(__file__).parent
LOGO_PATH = SCRIPT_DIR / "frontend" / "public" / "logo.png"
OUTPUT_PATH = SCRIPT_DIR / "trackvibe_ytp.mp4"

# TrackVibe brand colors
SAGE = (107, 142, 107)
SAGE_DARK = (78, 110, 78)
SAGE_LIGHT = (160, 195, 160)
TERRACOTTA = (192, 107, 83)
GOLD = (198, 170, 95)
CHARCOAL = (38, 42, 51)
CREAM = (255, 255, 255)
MIST = (242, 243, 246)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (220, 50, 50)
GREEN = (50, 200, 80)

random.seed(42)
np.random.seed(42)

# ─── FONT HELPERS ────────────────────────────────────────────────────────────
def get_font(size, bold=False):
    """Get a font, falling back through system fonts."""
    candidates = []
    if bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-Bold.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-Regular.ttf",
        ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def get_impact_font(size):
    """Get Impact-like bold font for meme text."""
    candidates = [
        "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


# ─── YTP EFFECTS ─────────────────────────────────────────────────────────────

def rgb_split(img, offset):
    """Chromatic aberration / RGB channel split."""
    arr = np.array(img)
    result = np.zeros_like(arr)
    ox, oy = int(offset), int(offset * 0.7)
    # Red channel shifted left
    result[:, :max(0, arr.shape[1]-ox), 0] = arr[:, min(ox, arr.shape[1]):, 0]
    # Green channel stays
    result[:, :, 1] = arr[:, :, 1]
    # Blue channel shifted right
    result[:, min(ox, arr.shape[1]):, 2] = arr[:, :max(0, arr.shape[1]-ox), 2]
    return Image.fromarray(result)


def shake(img, intensity):
    """Camera shake effect."""
    dx = random.randint(-intensity, intensity)
    dy = random.randint(-intensity, intensity)
    return ImageChops.offset(img, dx, dy)


def deep_fry(img, amount=1.5):
    """Deep fry: oversaturate + sharpen + contrast boost."""
    img = ImageEnhance.Color(img).enhance(1.0 + amount)
    img = ImageEnhance.Contrast(img).enhance(1.0 + amount * 0.8)
    img = ImageEnhance.Sharpness(img).enhance(1.0 + amount * 2)
    # Add slight JPEG artifacts by re-encoding
    buf = BytesIO()
    img.save(buf, format='JPEG', quality=max(5, int(40 - amount * 15)))
    buf.seek(0)
    return Image.open(buf).convert('RGB')


def zoom_pulse(img, scale):
    """Zoom in/out from center."""
    w, h = img.size
    new_w, new_h = int(w * scale), int(h * scale)
    if new_w < 10 or new_h < 10:
        return img
    resized = img.resize((new_w, new_h), Image.LANCZOS)
    result = Image.new('RGB', (w, h), BLACK)
    paste_x = (w - new_w) // 2
    paste_y = (h - new_h) // 2
    if scale >= 1.0:
        # Crop center
        left = (new_w - w) // 2
        top = (new_h - h) // 2
        return resized.crop((left, top, left + w, top + h))
    else:
        result.paste(resized, (paste_x, paste_y))
        return result


def scanlines(img, spacing=4, alpha=60):
    """Add CRT scanline overlay."""
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(0, img.size[1], spacing):
        draw.line([(0, y), (img.size[0], y)], fill=(0, 0, 0, alpha))
    result = img.convert('RGBA')
    result = Image.alpha_composite(result, overlay)
    return result.convert('RGB')


def color_invert(img):
    """Invert all colors."""
    return ImageChops.invert(img)


def flash_frame(color, size=(W, H)):
    """Solid color frame."""
    return Image.new('RGB', size, color)


def vhs_noise(img, intensity=30):
    """Add VHS-style noise."""
    arr = np.array(img).astype(np.int16)
    noise = np.random.randint(-intensity, intensity, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def glitch_slice(img, num_slices=5, max_offset=50):
    """Randomly shift horizontal slices."""
    arr = np.array(img)
    h = arr.shape[0]
    for _ in range(num_slices):
        y = random.randint(0, h - 20)
        height = random.randint(5, 40)
        offset = random.randint(-max_offset, max_offset)
        arr[y:y+height] = np.roll(arr[y:y+height], offset, axis=1)
    return Image.fromarray(arr)


# ─── DRAWING HELPERS ─────────────────────────────────────────────────────────

def draw_centered_text(draw, y, text, font, fill=WHITE, stroke_width=0, stroke_fill=BLACK):
    """Draw horizontally centered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    if stroke_width:
        draw.text((x, y), text, font=font, fill=fill,
                  stroke_width=stroke_width, stroke_fill=stroke_fill)
    else:
        draw.text((x, y), text, font=font, fill=fill)


def draw_meme_text(img, text, y=None, size=80, color=WHITE):
    """Draw Impact-style meme text with black outline."""
    draw = ImageDraw.Draw(img)
    font = get_impact_font(size)
    if y is None:
        y = H // 2 - size // 2
    draw_centered_text(draw, y, text, font, fill=color, stroke_width=4, stroke_fill=BLACK)
    return img


def draw_card(img, x, y, w, h, color=WHITE, radius=20, shadow=True):
    """Draw a rounded card with optional shadow."""
    draw = ImageDraw.Draw(img)
    if shadow:
        # Shadow
        for i in range(5):
            draw.rounded_rectangle(
                [x+i+2, y+i+2, x+w+i+2, y+h+i+2],
                radius=radius, fill=(0, 0, 0, 20) if img.mode == 'RGBA' else (200, 200, 200)
            )
    draw.rounded_rectangle([x, y, x+w, y+h], radius=radius, fill=color)
    return img


def draw_progress_circle(img, cx, cy, radius, progress, color, label, bg=(230, 230, 230)):
    """Draw a circular progress indicator."""
    draw = ImageDraw.Draw(img)
    # Background circle
    draw.ellipse([cx-radius, cy-radius, cx+radius, cy+radius], outline=bg, width=12)
    # Progress arc
    start = -90
    end = start + int(360 * progress)
    draw.arc([cx-radius, cy-radius, cx+radius, cy+radius],
             start=start, end=end, fill=color, width=12)
    # Center text
    font = get_font(24, bold=True)
    pct_text = f"{int(progress * 100)}%"
    bbox = draw.textbbox((0, 0), pct_text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw//2, cy - th//2 - 5), pct_text, font=font, fill=CHARCOAL)
    # Label below
    small_font = get_font(18)
    bbox = draw.textbbox((0, 0), label, font=small_font)
    tw = bbox[2] - bbox[0]
    draw.text((cx - tw//2, cy + radius + 10), label, font=small_font, fill=CHARCOAL)


def draw_food_card(img, y, name, portion, calories, color=WHITE, highlight=False):
    """Draw a food entry card."""
    draw = ImageDraw.Draw(img)
    card_x, card_w, card_h = 60, W - 120, 140
    bg = (255, 240, 240) if highlight else color
    draw.rounded_rectangle([card_x, y, card_x+card_w, y+card_h], radius=16, fill=bg)

    # Food icon placeholder (circle)
    icon_r = 30
    icon_cx = card_x + 50
    icon_cy = y + card_h // 2
    draw.ellipse([icon_cx-icon_r, icon_cy-icon_r, icon_cx+icon_r, icon_cy+icon_r],
                 fill=SAGE_LIGHT)

    # Text
    name_font = get_font(32, bold=True)
    portion_font = get_font(22)
    cal_font = get_font(28, bold=True)

    draw.text((card_x + 100, y + 25), name, font=name_font, fill=CHARCOAL)
    draw.text((card_x + 100, y + 70), portion, font=portion_font, fill=(120, 120, 120))

    # Calories on right
    cal_text = f"{calories} kcal"
    bbox = draw.textbbox((0, 0), cal_text, font=cal_font)
    tw = bbox[2] - bbox[0]
    cal_color = RED if highlight else TERRACOTTA
    draw.text((card_x + card_w - tw - 30, y + 45), cal_text, font=cal_font, fill=cal_color)
    return img


def draw_workout_card(img, y, title, exercises):
    """Draw a workout card with exercise list."""
    draw = ImageDraw.Draw(img)
    card_x, card_w = 60, W - 120
    card_h = 100 + len(exercises) * 50
    draw.rounded_rectangle([card_x, y, card_x+card_w, y+card_h], radius=16, fill=WHITE)

    # Title
    title_font = get_font(36, bold=True)
    draw.text((card_x + 30, y + 20), title, font=title_font, fill=CHARCOAL)

    # Exercises
    ex_font = get_font(24)
    sets_font = get_font(22, bold=True)
    for i, (name, sets_reps) in enumerate(exercises):
        ey = y + 80 + i * 50
        draw.text((card_x + 30, ey), name, font=ex_font, fill=CHARCOAL)
        bbox = draw.textbbox((0, 0), sets_reps, font=sets_font)
        tw = bbox[2] - bbox[0]
        draw.text((card_x + card_w - tw - 30, ey), sets_reps, font=sets_font, fill=SAGE)

    return img


def draw_bottom_nav(img):
    """Draw a mobile bottom navigation bar."""
    draw = ImageDraw.Draw(img)
    nav_h = 90
    nav_y = H - nav_h
    draw.rectangle([0, nav_y, W, H], fill=WHITE)
    draw.line([(0, nav_y), (W, nav_y)], fill=(220, 220, 220), width=2)

    labels = ["Home", "Food", "+", "Goals", "More"]
    section_w = W // 5
    font = get_font(18)
    for i, label in enumerate(labels):
        cx = section_w * i + section_w // 2
        if label == "+":
            # Center plus button
            draw.ellipse([cx-30, nav_y+10, cx+30, nav_y+70], fill=SAGE)
            plus_font = get_font(36, bold=True)
            bbox = draw.textbbox((0, 0), "+", font=plus_font)
            tw = bbox[2] - bbox[0]
            draw.text((cx - tw//2, nav_y + 15), "+", font=plus_font, fill=WHITE)
        else:
            # Icon placeholder (small circle)
            draw.ellipse([cx-12, nav_y+12, cx+12, nav_y+36], fill=MIST)
            bbox = draw.textbbox((0, 0), label, font=font)
            tw = bbox[2] - bbox[0]
            draw.text((cx - tw//2, nav_y + 50), label, font=font, fill=(140, 140, 140))
    return img


def draw_status_bar(img):
    """Draw a fake phone status bar."""
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 50], fill=SAGE_DARK)
    font = get_font(18)
    draw.text((30, 15), "9:41", font=font, fill=WHITE)
    # Battery
    draw.rounded_rectangle([W-80, 15, W-30, 35], radius=3, fill=None, outline=WHITE, width=2)
    draw.rectangle([W-75, 18, W-40, 32], fill=WHITE)
    return img


def make_phone_frame(bg_color=MIST):
    """Create a base phone frame with status bar and nav."""
    img = Image.new('RGB', (W, H), bg_color)
    draw_status_bar(img)
    draw_bottom_nav(img)
    return img


# ─── LOGO ────────────────────────────────────────────────────────────────────

def load_logo(size=400):
    """Load and resize the TrackVibe logo."""
    if LOGO_PATH.exists():
        logo = Image.open(LOGO_PATH).convert('RGBA')
        logo.thumbnail((size, size), Image.LANCZOS)
        return logo
    # Fallback: draw text
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = get_impact_font(size // 3)
    draw.text((size//6, size//3), "TrackVibe", font=font, fill=SAGE)
    return img


# ─── SCENE GENERATORS ────────────────────────────────────────────────────────
# Each returns a list of PIL Images (frames)

def scene_logo_slam():
    """Scene 1: Logo slam with glitch effects (2s = 48 frames)."""
    frames = []
    logo = load_logo(500)

    for i in range(48):
        img = Image.new('RGB', (W, H), BLACK)

        if i < 6:
            # Zoom in from huge
            scale = 4.0 - (i / 6) * 3.0
            sz = int(500 * scale)
            if sz > 10:
                big_logo = logo.resize((sz, sz), Image.LANCZOS)
                px = (W - sz) // 2
                py = (H - sz) // 2
                img.paste(big_logo, (px, py), big_logo)
            img = shake(img, 30 - i * 4)
        elif i < 12:
            # Logo settles with RGB split
            px = (W - logo.size[0]) // 2
            py = (H - logo.size[1]) // 2
            img.paste(logo, (px, py), logo)
            offset = max(0, 20 - (i - 6) * 4)
            img = rgb_split(img, offset)
        elif i < 20:
            # Logo stable, add scanlines
            px = (W - logo.size[0]) // 2
            py = (H - logo.size[1]) // 2
            img.paste(logo, (px, py), logo)
            img = scanlines(img)
            # Add "TrackVibe" text below
            img = draw_meme_text(img, "TrackVibe", y=H//2 + 200, size=120, color=SAGE)
        elif i < 24:
            # Flash white
            bright = int(255 * (1.0 - (i - 20) / 4))
            img = Image.new('RGB', (W, H), (bright, bright, bright))
            if bright < 200:
                px = (W - logo.size[0]) // 2
                py = (H - logo.size[1]) // 2
                img.paste(logo, (px, py), logo)
        elif i < 36:
            # Logo with glitch slices
            px = (W - logo.size[0]) // 2
            py = (H - logo.size[1]) // 2
            img.paste(logo, (px, py), logo)
            img = draw_meme_text(img, "TrackVibe", y=H//2 + 200, size=120, color=SAGE)
            if i % 3 == 0:
                img = glitch_slice(img, num_slices=3, max_offset=30)
            img = vhs_noise(img, 15)
        else:
            # Fade to sage
            t = (i - 36) / 12
            r = int(BLACK[0] * (1-t) + SAGE_DARK[0] * t)
            g = int(BLACK[1] * (1-t) + SAGE_DARK[1] * t)
            b = int(BLACK[2] * (1-t) + SAGE_DARK[2] * t)
            img = Image.new('RGB', (W, H), (r, g, b))
            px = (W - logo.size[0]) // 2
            py = (H - logo.size[1]) // 2
            img.paste(logo, (px, py), logo)

        frames.append(img)
    return frames


def scene_today_is_the_day():
    """Scene 2: 'TODAY I TRACK EVERYTHING' with stutter (2s = 48 frames)."""
    frames = []
    stutter_texts = [
        "TODAY", "TODAY", "TODAY I", "TODAY I TR-", "TODAY I TR-",
        "TODAY I TR-TR-", "TODAY I TR-TR-TR-", "TODAY I TR-TR-TR-TRACK",
        "TODAY I TRACK", "TODAY I TRACK EVERYTHING",
        "TODAY I TRACK EVERYTHING", "TODAY I TRACK EVERYTHING",
    ]

    for i in range(48):
        img = Image.new('RGB', (W, H), SAGE_DARK)

        # Pick stutter text
        text_idx = min(i // 4, len(stutter_texts) - 1)
        text = stutter_texts[text_idx]

        # Size pulses
        base_size = 70
        pulse = math.sin(i * 0.5) * 10
        size = int(base_size + pulse)
        if i >= 28:
            size = int(base_size + (i - 28) * 3)  # Grow bigger at end

        img = draw_meme_text(img, text, y=H//2 - 100, size=size, color=WHITE)

        # Add motivational subtext after stutter resolves
        if i > 32:
            draw = ImageDraw.Draw(img)
            sub_font = get_font(28)
            draw_centered_text(draw, H//2 + 80, "* opens TrackVibe with determination *",
                             sub_font, fill=GOLD)

        # Zoom pulse
        if i > 20:
            scale = 1.0 + math.sin(i * 0.8) * 0.03
            img = zoom_pulse(img, scale)

        # Random shake on stutter moments
        if "TR-" in text:
            img = shake(img, 15)

        frames.append(img)
    return frames


def scene_breakfast_log():
    """Scene 3: Logging breakfast - oatmeal good, coffee sus (3s = 72 frames)."""
    frames = []

    for i in range(72):
        img = make_phone_frame()
        draw = ImageDraw.Draw(img)

        # Header
        header_font = get_font(36, bold=True)
        draw.text((60, 80), "Breakfast", font=header_font, fill=CHARCOAL)

        small_font = get_font(22)
        draw.text((60, 125), "Tuesday Morning", font=small_font, fill=(140, 140, 140))

        if i < 36:
            # Show oatmeal card sliding in
            card_y = max(180, 180 + (36 - i) * 20) if i < 12 else 180
            draw_food_card(img, card_y, "Oatmeal with Berries", "1 bowl (250g)", 300)

            # Checkmark appears
            if i > 18:
                check_font = get_font(48, bold=True)
                draw.text((W - 140, card_y + 45), "✓", font=check_font, fill=GREEN)

            # "CLEAN EATING MODE: ON" text
            if 20 < i < 36:
                img = draw_meme_text(img, "CLEAN EATING", y=420, size=60, color=GREEN)
                img = draw_meme_text(img, "MODE: ON", y=490, size=60, color=GREEN)

        else:
            # Show oatmeal card (stays)
            draw_food_card(img, 180, "Oatmeal with Berries", "1 bowl (250g)", 300)
            check_font = get_font(48, bold=True)
            draw.text((W - 140, 225), "✓", font=check_font, fill=GREEN)

            # Coffee card slides in with glitch
            coffee_y = 340
            draw_food_card(img, coffee_y, "Coffee w/ 4 Sugars", "1 large mug", 180, highlight=True)

            # Glitch effect on the coffee card area
            if i % 4 < 2 and i < 60:
                img = glitch_slice(img, num_slices=2, max_offset=20)

            # Caption
            if i > 48:
                caption_font = get_font(26)
                draw_centered_text(draw, coffee_y + 160,
                                 "we don't talk about that one",
                                 caption_font, fill=(180, 80, 80))

            # Slight shake
            if 36 < i < 50:
                img = shake(img, 5)

        frames.append(img)
    return frames


def scene_macro_circles():
    """Scene 4: Macro circles - protein stuck at 12% (3s = 72 frames)."""
    frames = []

    for i in range(72):
        img = make_phone_frame(WHITE)
        draw = ImageDraw.Draw(img)

        # Title
        title_font = get_font(36, bold=True)
        draw.text((60, 80), "Daily Macros", font=title_font, fill=CHARCOAL)

        t = min(1.0, i / 36)  # Animation progress

        # Three macro circles
        circle_y = 400
        circle_r = 80

        # Protein - stuck at 12%
        protein_progress = min(0.12, t * 0.5)
        draw_progress_circle(img, W//4, circle_y, circle_r, protein_progress, TERRACOTTA, "Protein")

        # Carbs - racing ahead
        carbs_progress = min(0.78, t * 1.2)
        draw_progress_circle(img, W//2, circle_y, circle_r, carbs_progress, GOLD, "Carbs")

        # Fats - moderate
        fats_progress = min(0.45, t * 0.7)
        draw_progress_circle(img, 3*W//4, circle_y, circle_r, fats_progress, SAGE, "Fats")

        # "WHERE'S THE PROTEIN" text escalation
        if i > 30:
            intensity = min(1.0, (i - 30) / 20)
            size = int(40 + intensity * 60)
            texts = [
                "where's the protein",
                "WHERE'S THE PROTEIN",
                "WHERE'S THE PROTEIN??",
                "WHERE'S THE PROTEIN???",
            ]
            text_idx = min(int(intensity * 3.99), 3)
            y_pos = int(600 + math.sin(i * 0.5) * 20 * intensity)
            img = draw_meme_text(img, texts[text_idx], y=y_pos, size=size,
                               color=TERRACOTTA)

            if i > 55:
                # Deep fry effect intensifies
                fry_amount = (i - 55) / 17 * 1.5
                img = deep_fry(img, fry_amount)
                img = shake(img, int(intensity * 10))

        frames.append(img)
    return frames


def scene_workout_time():
    """Scene 5: Push Day workout card (3s = 72 frames)."""
    frames = []
    exercises = [
        ("Bench Press", "4 × 8"),
        ("Incline DB Press", "3 × 10"),
        ("Cable Flyes", "3 × 12"),
        ("Tricep Pushdowns", "3 × 15"),
        ("Lateral Raises", "4 × 12"),
    ]

    for i in range(72):
        img = make_phone_frame()
        draw = ImageDraw.Draw(img)

        # Header
        header_font = get_font(36, bold=True)
        draw.text((60, 80), "Today's Workout", font=header_font, fill=CHARCOAL)

        if i < 20:
            # Workout card slides in
            offset_y = max(0, (20 - i) * 30)
            draw_workout_card(img, 180 + offset_y, "Push Day", exercises[:min(i//4 + 1, 5)])
        elif i < 40:
            # Full card shown, then "Bench Press 4x8" zooms
            draw_workout_card(img, 180, "Push Day", exercises)
            t = (i - 20) / 20
            if t > 0.3:
                scale = 1.0 + (t - 0.3) * 2.0
                img = zoom_pulse(img, scale)
                # Bench Press text gets huge
                bench_size = int(40 + (t - 0.3) * 200)
                img = draw_meme_text(img, "BENCH PRESS", y=H//2 - bench_size//2,
                                   size=min(bench_size, 140), color=WHITE)
        else:
            # "LIGHTWEIGHT BABY" moment
            img = Image.new('RGB', (W, H), CHARCOAL)
            img = draw_meme_text(img, "LIGHTWEIGHT", y=H//2 - 120, size=110, color=WHITE)
            img = draw_meme_text(img, "BABY!!!", y=H//2 + 20, size=130, color=GOLD)

            # Bass-boosted visual shake
            shake_intensity = int(20 + math.sin(i * 2) * 15)
            img = shake(img, shake_intensity)
            if i % 3 == 0:
                img = rgb_split(img, 15)
            img = deep_fry(img, 0.5)
            img = scanlines(img, spacing=3)

        frames.append(img)
    return frames


def scene_the_counting():
    """Scene 6: Counting sets and reps, failing on rep 7 (3s = 72 frames)."""
    frames = []

    for i in range(72):
        img = Image.new('RGB', (W, H), CHARCOAL)

        if i < 32:
            # Counting sets: 1...2...3...4
            set_num = min(4, i // 8 + 1)
            size = 250 + (i % 8) * 5
            img = draw_meme_text(img, f"SET {set_num}", y=H//2 - 200, size=min(size, 280), color=WHITE)

            # Add counter dots
            draw = ImageDraw.Draw(img)
            for s in range(set_num):
                dot_x = W//2 - 80 + s * 50
                draw.ellipse([dot_x-15, H//2+100, dot_x+15, H//2+130], fill=SAGE)

            img = shake(img, 20 if (i % 8 == 0) else 3)

        elif i < 56:
            # Counting reps: 8...8...8...7
            rep_idx = (i - 32) // 6
            reps = [8, 8, 8, 7]
            rep = reps[min(rep_idx, 3)]

            color = WHITE
            if rep == 7 and rep_idx >= 3:
                # Record scratch! Color invert
                color = RED
                if i > 50:
                    img = color_invert(img)
                    color = (0, 200, 200)  # Inverted red

            img = draw_meme_text(img, f"REP {rep}", y=H//2 - 150, size=200, color=color)

            if rep == 7:
                img = draw_meme_text(img, "...wait", y=H//2 + 100, size=60, color=GOLD)
                img = shake(img, 25)
                if i % 2 == 0:
                    img = glitch_slice(img, 8, 60)
        else:
            # "ok it was 7"
            img = Image.new('RGB', (W, H), BLACK)
            if i < 64:
                img = draw_meme_text(img, "FAILURE IS", y=H//2 - 100, size=80, color=WHITE)
                img = draw_meme_text(img, "NOT AN OPTION", y=H//2, size=80, color=WHITE)
            else:
                img = draw_meme_text(img, "ok it was 7", y=H//2 - 40, size=60, color=(180, 180, 180))
                # Sad small text
                draw = ImageDraw.Draw(img)
                small_font = get_font(24)
                draw_centered_text(draw, H//2 + 60, "we'll get em next time", small_font, fill=(120, 120, 120))

        frames.append(img)
    return frames


def scene_calorie_math():
    """Scene 7: Calorie math panic + pizza revelation (3s = 72 frames)."""
    frames = []

    for i in range(72):
        img = Image.new('RGB', (W, H), WHITE)

        if i < 28:
            # Numbers appearing one by one
            draw = ImageDraw.Draw(img)
            items = ["1200", "+ 300", "+ 180"]
            big_font = get_font(60, bold=True)
            y = 400
            for j, item in enumerate(items):
                if i > j * 8:
                    alpha = min(1.0, (i - j * 8) / 5)
                    c = int(CHARCOAL[0] * alpha)
                    draw.text((200 + j * 10, y + j * 80), item,
                             font=big_font, fill=(c, c, c+10))

            if i > 20:
                # "???" appears
                q_font = get_font(80, bold=True)
                draw.text((200, y + 250), "+ ???", font=q_font, fill=TERRACOTTA)
                img = shake(img, 5)

        elif i < 48:
            # THE PIZZA REVEAL
            t = (i - 28) / 20

            if t < 0.3:
                img = Image.new('RGB', (W, H), WHITE)
                # Pizza "icon" (triangle/circle)
                draw = ImageDraw.Draw(img)
                cx, cy = W//2, H//2
                size = int(100 + t * 500)
                draw.regular_polygon((cx, cy, size), 3, rotation=180, fill=GOLD)
                draw.ellipse([cx-size//3, cy-size//3, cx+size//3, cy+size//3],
                           fill=TERRACOTTA)
            else:
                img = Image.new('RGB', (W, H), TERRACOTTA)
                img = draw_meme_text(img, "THE PIZZA WAS", y=H//2 - 150, size=70, color=WHITE)
                img = draw_meme_text(img, "800 CALORIES", y=H//2 - 40, size=100, color=WHITE)
                # Deep fry intensifies
                fry = (t - 0.3) * 3
                img = deep_fry(img, min(fry, 2.0))
                img = zoom_pulse(img, 1.0 + fry * 0.1)
                img = shake(img, int(fry * 15))
        else:
            # Daily total goes RED
            img = Image.new('RGB', (W, H), BLACK)
            draw = ImageDraw.Draw(img)

            total = 2480
            total_font = get_font(40, bold=True)
            draw_centered_text(draw, H//2 - 200, "DAILY TOTAL", total_font, fill=(180, 180, 180))

            # Big red number
            num_font = get_impact_font(160)
            draw_centered_text(draw, H//2 - 120, str(total), num_font, fill=RED,
                             stroke_width=3, stroke_fill=(100, 0, 0))

            goal_font = get_font(30)
            draw_centered_text(draw, H//2 + 80, "Goal: 2000", goal_font, fill=(100, 100, 100))

            # Red pulsing
            if i % 4 < 2:
                arr = np.array(img)
                arr[:,:,0] = np.minimum(255, arr[:,:,0].astype(np.int16) + 30).astype(np.uint8)
                img = Image.fromarray(arr)

            img = vhs_noise(img, 20)

        frames.append(img)
    return frames


def scene_the_scroll():
    """Scene 8: Scrolling food log with embarrassing entries (3s = 72 frames)."""
    frames = []

    entries = [
        ("Grilled Chicken Breast", "200g", 330, False),
        ("Brown Rice", "1 cup", 215, False),
        ("Protein Shake", "1 scoop", 120, False),
        ("Greek Yogurt", "150g", 100, False),
        ("Apple", "1 medium", 95, False),
        ("Almonds", "handful", 170, False),
        ("Banana", "1 large", 120, False),
        ("Salad w/ Dressing", "1 bowl", 280, False),
        ("'Just One' Cookie", "3 cookies", 450, True),
        ("Mystery Cafeteria Meat", "???", 350, True),
        ("Shredded Cheese", "handful, 12:47 AM", 110, True),
        ("Spoon of Peanut Butter", "4 spoons", 380, True),
        ("Water", "finally", 0, False),
        ("Regret", "immeasurable", 0, True),
    ]

    for i in range(72):
        img = make_phone_frame()
        draw = ImageDraw.Draw(img)

        header_font = get_font(32, bold=True)
        draw.text((60, 80), "Food Log", font=header_font, fill=CHARCOAL)

        # Scroll offset - starts slow, gets fast
        t = i / 72
        scroll_speed = t * t * 4  # Accelerating
        scroll_offset = int(i * 15 * scroll_speed)

        # Draw visible food entries
        for j, (name, portion, cals, sus) in enumerate(entries):
            card_y = 160 + j * 160 - scroll_offset
            if -160 < card_y < H - 90:
                draw_food_card(img, card_y, name, portion, cals, highlight=sus)

        # Freeze frame on embarrassing entries
        if 35 < i < 42:
            # Freeze on shredded cheese
            img2 = make_phone_frame()
            draw_food_card(img2, H//2 - 70, "Shredded Cheese", "handful, 12:47 AM", 110, highlight=True)
            draw2 = ImageDraw.Draw(img2)
            caption_font = get_font(30)
            draw_centered_text(draw2, H//2 + 100, '"no judgment zone"',
                             caption_font, fill=TERRACOTTA)
            img = img2
            img = shake(img, 3)  # Nervous shake

        if 55 < i < 62:
            # Freeze on regret
            img2 = Image.new('RGB', (W, H), BLACK)
            img2 = draw_meme_text(img2, "Regret", y=H//2 - 100, size=100, color=WHITE)
            img2 = draw_meme_text(img2, "immeasurable", y=H//2 + 30, size=60, color=(180, 180, 180))
            img = img2

        # Speed lines at high speed
        if t > 0.5 and not (35 < i < 42) and not (55 < i < 62):
            img = vhs_noise(img, int(t * 30))

        frames.append(img)
    return frames


def scene_goal_hit():
    """Scene 9: Weekly goal progress to 100% with explosion (4s = 96 frames)."""
    frames = []

    for i in range(96):
        if i < 60:
            # Progress bar filling
            img = Image.new('RGB', (W, H), WHITE)
            draw = ImageDraw.Draw(img)

            # Title
            title_font = get_font(40, bold=True)
            draw_centered_text(draw, 300, "Weekly Workout Goal", title_font, fill=CHARCOAL)

            sub_font = get_font(28)
            draw_centered_text(draw, 360, "3 of 3 workouts", sub_font, fill=(120, 120, 120))

            # Progress bar
            bar_x, bar_w, bar_h = 100, W - 200, 60
            bar_y = H // 2 - 30
            draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h],
                                 radius=30, fill=MIST)

            progress = min(1.0, (i / 50) ** 1.5)  # Easing
            fill_w = int(bar_w * progress)
            if fill_w > 5:
                # Color transitions from sage to gold as it fills
                r = int(SAGE[0] * (1-progress) + GOLD[0] * progress)
                g = int(SAGE[1] * (1-progress) + GOLD[1] * progress)
                b = int(SAGE[2] * (1-progress) + GOLD[2] * progress)
                draw.rounded_rectangle([bar_x, bar_y, bar_x + fill_w, bar_y + bar_h],
                                     radius=30, fill=(r, g, b))

            # Percentage
            pct_font = get_font(60, bold=True)
            pct = int(progress * 100)
            draw_centered_text(draw, bar_y + 80, f"{pct}%", pct_font, fill=CHARCOAL)

            # Buildup shake
            if progress > 0.8:
                intensity = int((progress - 0.8) * 50)
                img = shake(img, intensity)

        elif i < 80:
            # EXPLOSION - confetti
            img = Image.new('RGB', (W, H), BLACK)
            t = (i - 60) / 20

            # Flash
            if t < 0.15:
                img = flash_frame(WHITE)
            elif t < 0.3:
                img = flash_frame(GOLD)
            else:
                # Confetti particles
                draw = ImageDraw.Draw(img)
                colors = [SAGE, TERRACOTTA, GOLD, SAGE_LIGHT, WHITE, GREEN]
                n_particles = 80
                for p in range(n_particles):
                    px = random.randint(0, W)
                    py = random.randint(0, H)
                    size = random.randint(8, 30)
                    color = random.choice(colors)
                    if random.random() > 0.5:
                        draw.rectangle([px, py, px+size, py+size//2], fill=color)
                    else:
                        draw.ellipse([px, py, px+size, py+size], fill=color)

                img = draw_meme_text(img, "WEEKLY GOAL", y=H//2 - 150, size=90, color=WHITE)
                img = draw_meme_text(img, "CRUSHED", y=H//2 - 20, size=120, color=GOLD)

            img = shake(img, 10)
            if i % 2 == 0:
                img = rgb_split(img, 8)

        else:
            # Celebration continues, calming
            t = (i - 80) / 16
            img = Image.new('RGB', (W, H), BLACK)

            # Fewer particles
            draw = ImageDraw.Draw(img)
            colors = [SAGE, TERRACOTTA, GOLD]
            for p in range(int(40 * (1 - t))):
                px = random.randint(0, W)
                py = random.randint(0, H)
                size = random.randint(5, 20)
                draw.rectangle([px, py, px+size, py+size//2], fill=random.choice(colors))

            img = draw_meme_text(img, "CRUSHED", y=H//2 - 50, size=100, color=GOLD)

            # Fade text
            sub_alpha = int(255 * min(1.0, t * 2))
            small = draw_meme_text(img, "we're so back", y=H//2 + 100, size=50,
                                  color=(sub_alpha, sub_alpha, sub_alpha))
            img = small

        frames.append(img)
    return frames


def scene_the_voice():
    """Scene 10: Voice input - works then fails (3s = 72 frames)."""
    frames = []

    for i in range(72):
        img = make_phone_frame(WHITE)
        draw = ImageDraw.Draw(img)

        if i < 36:
            # Mic icon and speech bubble
            title_font = get_font(32, bold=True)
            draw.text((60, 80), "Voice Input", font=title_font, fill=CHARCOAL)

            # Mic icon (circle with lines)
            cx, cy = W // 2, 400
            mic_r = 50
            draw.rounded_rectangle([cx-25, cy-50, cx+25, cy+30], radius=15, fill=SAGE)
            draw.arc([cx-35, cy+5, cx+35, cy+55], start=0, end=180, fill=SAGE, width=4)
            draw.line([(cx, cy+55), (cx, cy+80)], fill=SAGE, width=4)

            # Pulse rings
            if i > 5:
                for ring in range(3):
                    ring_r = mic_r + 20 + ring * 25 + (i % 8) * 3
                    alpha = max(0, 200 - ring * 60 - (i % 8) * 20)
                    ring_color = (SAGE[0], SAGE[1], SAGE[2])
                    draw.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r],
                               outline=ring_color, width=2)

            if i > 12:
                # Speech bubble
                bubble_y = 550
                draw.rounded_rectangle([100, bubble_y, W-100, bubble_y + 80],
                                     radius=20, fill=MIST)
                text = "I had chicken and rice for dinner"
                # Typing animation
                visible = text[:min(len(text), (i - 12) * 2)]
                speech_font = get_font(24)
                draw.text((130, bubble_y + 25), visible, font=speech_font, fill=CHARCOAL)

            if i > 28:
                # Result card appears
                draw_food_card(img, 700, "Chicken & Rice", "1 serving (350g)", 480)
                check_font = get_font(48, bold=True)
                draw.text((W - 140, 745), "✓", font=check_font, fill=GREEN)
                img = draw_meme_text(img, "THE FUTURE IS NOW", y=900, size=55, color=SAGE)

        else:
            # Second attempt - fails hilariously
            title_font = get_font(32, bold=True)
            draw.text((60, 80), "Voice Input", font=title_font, fill=CHARCOAL)

            # Mic with error vibes
            cx, cy = W // 2, 400
            draw.rounded_rectangle([cx-25, cy-50, cx+25, cy+30], radius=15, fill=TERRACOTTA)
            draw.arc([cx-35, cy+5, cx+35, cy+55], start=0, end=180, fill=TERRACOTTA, width=4)

            # Garbled speech bubble
            bubble_y = 550
            draw.rounded_rectangle([100, bubble_y, W-100, bubble_y + 80],
                                 radius=20, fill=(255, 240, 240))

            garbled_texts = [
                "I had uhh...",
                "I had uhh... the thing",
                "I h@d &hh... th€ th!ng??",
                "?̴̡?̵?̸?̵ ̸?̶?̴?̶ ̵?̸?̴?̵?̶",
            ]
            g_idx = min((i - 36) // 9, 3)
            speech_font = get_font(24)
            draw.text((130, bubble_y + 25), garbled_texts[g_idx],
                     font=speech_font, fill=RED)

            # Question marks flying around
            if i > 45:
                q_font = get_font(40, bold=True)
                for q in range(min(8, (i - 45) // 2)):
                    qx = random.randint(50, W - 100)
                    qy = random.randint(200, H - 200)
                    draw.text((qx, qy), "?", font=q_font, fill=TERRACOTTA)

            if i > 55:
                img = glitch_slice(img, 4, 30)
                img = shake(img, 8)

        frames.append(img)
    return frames


def scene_montage(all_scene_frames):
    """Scene 11: Rapid montage of previous scenes (3s = 72 frames)."""
    frames = []

    # Collect sample frames from each scene
    samples = []
    for scene_frames in all_scene_frames:
        # Pick a few representative frames
        if len(scene_frames) > 0:
            indices = [len(scene_frames)//4, len(scene_frames)//2, 3*len(scene_frames)//4]
            for idx in indices:
                if idx < len(scene_frames):
                    samples.append(scene_frames[idx])

    for i in range(72):
        # Show frames increasingly fast
        if i < 24:
            # 4 frames each
            idx = (i // 4) % len(samples)
        elif i < 48:
            # 2 frames each
            idx = (i // 2) % len(samples)
        else:
            # Every frame different
            idx = i % len(samples)

        img = samples[idx].copy()

        # Increasing glitch intensity
        t = i / 72
        if t > 0.3:
            img = rgb_split(img, int(t * 30))
        if t > 0.5:
            img = glitch_slice(img, int(t * 10), int(t * 80))
        if t > 0.7:
            img = vhs_noise(img, int(t * 50))
            img = shake(img, int(t * 20))

        # Flash frames
        if i % 12 == 0 and i > 24:
            img = flash_frame(random.choice([WHITE, SAGE, GOLD, TERRACOTTA]))

        frames.append(img)
    return frames


def scene_finale():
    """Scene 12: Calm ending with logo + tagline + pizza joke (3s = 72 frames)."""
    frames = []
    logo = load_logo(350)

    for i in range(72):
        # Calm sage background
        img = Image.new('RGB', (W, H), SAGE_DARK)
        draw = ImageDraw.Draw(img)

        # Logo fades in
        if i > 6:
            alpha = min(255, (i - 6) * 15)
            # Create a composited version
            logo_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            px = (W - logo.size[0]) // 2
            py = H // 2 - 350
            logo_layer.paste(logo, (px, py), logo)
            # Blend
            img = img.convert('RGBA')
            blended = Image.blend(
                Image.new('RGBA', (W, H), (*SAGE_DARK, 255)),
                Image.alpha_composite(Image.new('RGBA', (W, H), (*SAGE_DARK, 255)), logo_layer),
                min(1.0, alpha / 255)
            )
            img = blended.convert('RGB')

        # Tagline fades in
        if i > 20:
            tag_alpha = min(255, (i - 20) * 10)
            tag_color = (tag_alpha, tag_alpha, tag_alpha)
            font1 = get_font(44, bold=True)
            draw = ImageDraw.Draw(img)
            draw_centered_text(draw, H//2 + 20, "TrackVibe", font1, fill=tag_color)

            if i > 30:
                font2 = get_font(28)
                a2 = min(255, (i - 30) * 12)
                draw_centered_text(draw, H//2 + 80, "Your life. Your balance.",
                                 font2, fill=(a2, a2, a2))

        # Pizza night joke
        if i > 48:
            joke_alpha = min(200, (i - 48) * 10)
            joke_font = get_font(22)
            draw = ImageDraw.Draw(img)
            draw_centered_text(draw, H//2 + 160, "...even on pizza night.",
                             joke_font, fill=(joke_alpha, joke_alpha, joke_alpha))

        # Final comedic shake
        if 60 < i < 66:
            img = shake(img, 8)

        frames.append(img)
    return frames


# ─── AUDIO GENERATION ────────────────────────────────────────────────────────

def generate_audio(total_frames, fps, output_path):
    """Generate synthetic audio track with beeps, bass, and chaos."""
    duration = total_frames / fps
    sample_rate = 44100
    n_samples = int(duration * sample_rate)

    audio = np.zeros(n_samples, dtype=np.float64)

    def add_tone(start_sec, dur_sec, freq, volume=0.3, fade=True):
        """Add a sine wave tone."""
        s = int(start_sec * sample_rate)
        e = min(n_samples, int((start_sec + dur_sec) * sample_rate))
        t = np.arange(e - s) / sample_rate
        wave_data = np.sin(2 * np.pi * freq * t) * volume
        if fade and len(t) > 100:
            # Fade in/out
            fade_len = min(500, len(t) // 4)
            wave_data[:fade_len] *= np.linspace(0, 1, fade_len)
            wave_data[-fade_len:] *= np.linspace(1, 0, fade_len)
        audio[s:e] += wave_data

    def add_noise(start_sec, dur_sec, volume=0.2):
        """Add white noise burst."""
        s = int(start_sec * sample_rate)
        e = min(n_samples, int((start_sec + dur_sec) * sample_rate))
        audio[s:e] += np.random.uniform(-volume, volume, e - s)

    def add_bass_drop(start_sec, volume=0.5):
        """Bass drop: descending frequency."""
        dur = 0.5
        s = int(start_sec * sample_rate)
        e = min(n_samples, int((start_sec + dur) * sample_rate))
        t = np.arange(e - s) / sample_rate
        freq = 200 - t * 300  # Descending
        wave_data = np.sin(2 * np.pi * freq * t) * volume
        fade_len = min(500, len(t) // 2)
        wave_data[-fade_len:] *= np.linspace(1, 0, fade_len)
        audio[s:e] += wave_data

    def add_record_scratch(start_sec, volume=0.4):
        """Record scratch sound."""
        dur = 0.3
        s = int(start_sec * sample_rate)
        e = min(n_samples, int((start_sec + dur) * sample_rate))
        t = np.arange(e - s) / sample_rate
        # Descending chirp
        freq = 2000 * np.exp(-t * 10)
        wave_data = np.sin(2 * np.pi * freq * t) * volume
        audio[s:e] += wave_data
        # Add noise
        audio[s:e] += np.random.uniform(-volume*0.3, volume*0.3, e - s)

    # Scene timings (cumulative seconds based on frame counts)
    # Scene 1: Logo slam (0-2s)
    add_bass_drop(0.0, 0.6)
    add_tone(0.5, 0.3, 440, 0.4)  # Impact hit
    add_tone(0.8, 0.2, 880, 0.3)  # High accent
    add_noise(0.0, 0.5, 0.15)

    # Scene 2: Today is the day (2-4s)
    for j in range(6):
        add_tone(2.0 + j * 0.15, 0.1, 300 + j * 50, 0.3)  # Stutter beeps
    add_tone(3.0, 0.5, 523, 0.4)  # Resolve tone

    # Scene 3: Breakfast (4-7s)
    add_tone(4.5, 0.2, 800, 0.3)  # Checkmark ding
    add_tone(5.5, 0.3, 200, 0.4)  # Ominous tone for coffee
    add_noise(5.8, 0.3, 0.15)

    # Scene 4: Macro circles (7-10s)
    add_tone(7.0, 2.0, 150, 0.15)  # Low drone
    for j in range(5):
        add_tone(8.5 + j * 0.2, 0.15, 400 + j * 100, 0.3)  # Panic escalation
    add_bass_drop(9.5, 0.5)

    # Scene 5: Workout (10-13s)
    add_tone(10.0, 0.3, 330, 0.3)  # Card appear
    add_bass_drop(11.5, 0.7)  # LIGHTWEIGHT BABY bass drop
    add_noise(11.5, 1.0, 0.2)
    for j in range(4):
        add_tone(12.0 + j * 0.1, 0.08, 100 + j * 20, 0.5)  # Bass pulses

    # Scene 6: Counting (13-16s)
    for j in range(4):
        add_tone(13.0 + j * 0.35, 0.15, 440, 0.4)  # Set counts
    for j in range(4):
        freq = 440 if j < 3 else 220  # Rep 7 = low
        add_tone(14.4 + j * 0.25, 0.15, freq, 0.4)
    add_record_scratch(15.2)  # Record scratch on rep 7

    # Scene 7: Calorie math (16-19s)
    add_tone(16.0, 0.3, 523, 0.3)
    add_tone(16.8, 0.3, 587, 0.3)
    add_tone(17.3, 0.3, 659, 0.3)
    add_bass_drop(17.8, 0.6)  # Pizza reveal
    add_noise(18.0, 0.5, 0.3)
    add_tone(18.5, 1.0, 100, 0.4)  # Doom tone for red number

    # Scene 8: The scroll (19-22s)
    add_tone(19.0, 2.0, 180, 0.1)  # Background drone
    add_record_scratch(20.5)  # Freeze on cheese
    add_tone(21.0, 0.5, 150, 0.3)  # Ominous
    add_noise(21.5, 0.5, 0.15)

    # Scene 9: Goal hit (22-26s)
    # Building tension
    for j in range(20):
        add_tone(22.0 + j * 0.1, 0.08, 200 + j * 30, 0.2 + j * 0.01)
    # EXPLOSION
    add_noise(24.5, 0.3, 0.5)
    add_bass_drop(24.5, 0.8)
    add_tone(24.8, 0.5, 880, 0.5)  # Victory high note
    add_tone(25.0, 1.0, 523, 0.4)  # Celebration tone
    add_tone(25.5, 0.5, 659, 0.3)

    # Scene 10: Voice (26-29s)
    add_tone(26.0, 0.2, 700, 0.2)  # Mic activate
    add_tone(27.5, 0.3, 800, 0.3)  # Success ding
    add_record_scratch(28.0)  # Fail
    add_noise(28.5, 0.5, 0.25)
    for j in range(6):
        add_tone(28.2 + j * 0.1, 0.08, random.randint(200, 800), 0.2)  # Garble

    # Scene 11: Montage (29-32s)
    for j in range(15):
        add_tone(29.0 + j * 0.2, 0.1, random.randint(200, 1000), 0.25)
    add_noise(30.5, 1.5, 0.2)
    add_bass_drop(31.5, 0.5)

    # Scene 12: Finale (32-35s)
    add_tone(32.5, 2.0, 262, 0.3)  # Calm C note
    add_tone(33.0, 1.5, 330, 0.25)  # E note harmony
    add_tone(33.5, 1.0, 392, 0.2)  # G note (C major chord)
    # Final shake
    add_tone(34.5, 0.2, 300, 0.15)

    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.8

    # Convert to 16-bit PCM
    audio_int = (audio * 32767).astype(np.int16)

    # Write WAV
    with wave.open(output_path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int.tobytes())


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print("=== TrackVibe YouTube Poop Video Generator ===")
    print(f"Resolution: {W}x{H} @ {FPS}fps")
    print()

    # Create temp directory for frames
    frame_dir = Path(tempfile.mkdtemp(prefix="trackvibe_ytp_"))
    audio_path = frame_dir / "audio.wav"

    try:
        # Generate all scenes
        all_scenes = []

        scenes = [
            ("Logo Slam", scene_logo_slam),
            ("Today Is The Day", scene_today_is_the_day),
            ("Breakfast Log", scene_breakfast_log),
            ("Macro Circles", scene_macro_circles),
            ("Workout Time", scene_workout_time),
            ("The Counting", scene_the_counting),
            ("Calorie Math", scene_calorie_math),
            ("The Scroll", scene_the_scroll),
            ("Goal Hit", scene_goal_hit),
            ("The Voice", scene_the_voice),
        ]

        for name, func in scenes:
            print(f"  Generating: {name}...")
            scene_frames = func()
            all_scenes.append(scene_frames)
            print(f"    → {len(scene_frames)} frames")

        # Montage uses frames from previous scenes
        print(f"  Generating: Montage...")
        montage_frames = scene_montage(all_scenes)
        all_scenes.append(montage_frames)
        print(f"    → {len(montage_frames)} frames")

        # Finale
        print(f"  Generating: Finale...")
        finale_frames = scene_finale()
        all_scenes.append(finale_frames)
        print(f"    → {len(finale_frames)} frames")

        # Flatten all frames
        all_frames = []
        for scene_frames in all_scenes:
            all_frames.extend(scene_frames)

        total_frames = len(all_frames)
        duration = total_frames / FPS
        print(f"\nTotal: {total_frames} frames ({duration:.1f}s)")

        # Save frames as PNGs
        print("\nSaving frames...")
        for idx, frame in enumerate(all_frames):
            frame_path = frame_dir / f"{idx:06d}.png"
            frame.save(frame_path, optimize=False)
            if idx % 100 == 0:
                print(f"  {idx}/{total_frames} frames saved...")
        print(f"  {total_frames}/{total_frames} frames saved.")

        # Generate audio
        print("\nGenerating audio...")
        generate_audio(total_frames, FPS, str(audio_path))
        print("  Audio generated.")

        # Encode with ffmpeg
        print("\nEncoding video with ffmpeg...")
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(FPS),
            "-i", str(frame_dir / "%06d.png"),
            "-i", str(audio_path),
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            "-shortest",
            "-movflags", "+faststart",
            str(OUTPUT_PATH),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ffmpeg error:\n{result.stderr}")
            sys.exit(1)

        print(f"\n✓ Video saved to: {OUTPUT_PATH}")
        print(f"  Duration: {duration:.1f}s")
        print(f"  Resolution: {W}x{H}")
        print(f"  FPS: {FPS}")

        # Quick probe
        probe_cmd = ["ffprobe", "-v", "quiet", "-print_format", "json",
                     "-show_format", str(OUTPUT_PATH)]
        probe = subprocess.run(probe_cmd, capture_output=True, text=True)
        if probe.returncode == 0:
            import json
            info = json.loads(probe.stdout)
            size_mb = int(info.get("format", {}).get("size", 0)) / (1024 * 1024)
            print(f"  File size: {size_mb:.1f} MB")

    finally:
        # Clean up temp frames
        print("\nCleaning up temp files...")
        shutil.rmtree(frame_dir, ignore_errors=True)

    print("\nDone! 🎬")


if __name__ == "__main__":
    main()
