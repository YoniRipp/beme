# Claude Project Context
## Project Overview
This project is a mobile-oriented fitness tracking application.
The application allows users to:
- track food and calories
- log workouts
- manage exercises
- record portions and nutritional values
- browse foods and workouts
The project already contains working functionality.
The goal of future modifications is to **improve the user interface and user experience** so the application feels like a **real production mobile app** instead of a prototype.
---
# Critical Development Rules
When modifying this project you MUST follow these rules:
1. Never break existing functionality.
2. Never remove working features.
3. Do not rewrite backend logic unless absolutely necessary.
4. Avoid changing APIs unless required.
5. Focus primarily on UI, UX, and bug fixing.
This project should evolve gradually while preserving stability.
---
# Product Vision
The final product should feel like a polished mobile fitness application similar to:
- MyFitnessPal
- Strong App
- Apple Fitness
- Nike Training Club
The UI should feel:
- modern
- simple
- fast
- mobile-first
- production ready
Avoid generic AI-generated layouts.
Design decisions should resemble real consumer fitness apps used by millions of users.
---
# Mobile First Design Principles
This application should behave like a **native mobile application**.
Important design principles:
- vertical scrolling
- clear sections
- large touch targets
- comfortable spacing
- readable typography
- minimal clutter
Avoid desktop-style dashboards.
---
# Layout System
The interface should use **card-based layouts**.
Each major item should appear inside a card:
- Food items
- Workouts
- Exercises
Cards should have:
- rounded corners
- soft shadows
- clear spacing
- readable text hierarchy
---
# Spacing System
Use consistent spacing.
Spacing scale:
4px
8px
12px
16px
24px
32px
Avoid cramped UI elements.
Always maintain padding from screen edges.
---
# Typography Hierarchy
Use clear typography levels:
Primary Title
Section Title
Item Title
Body Text
Secondary Text
Food names and workout names should be visually prominent.
Calories and sets/reps should be secondary but readable.
---
# Food Tracking UI
Food items should appear as **Food Cards**.
Each food card should include:
- food image
- food name
- portion size
- calorie count
Example layout:
[Food Image]
Chicken Breast
200g
330 kcal
If no image exists, display a **food placeholder image**.
Calories should be visually emphasized.
Food names should be larger than other text.
---
# Workout Tracking UI
Workouts should appear as **Workout Cards**.
Each workout card should contain:
- workout name
- list of exercises
- sets and reps
Example structure:
Push Day
Bench Press
4 x 8
Incline Dumbbell Press
3 x 10
Exercises should be clearly separated and easy to scan.
---
# Exercise Items
Each exercise should display:
- exercise name
- sets
- reps
- optional exercise image or icon
Example:
Bench Press
4 sets × 8 reps
If images exist, display them consistently.
If not, use an exercise placeholder.
---
# Image Handling
The application should support images for:
- foods
- exercises
Image rules:
- square images
- rounded corners
- consistent size
- optimized for mobile
If images are missing, use placeholders.
Example placeholders:
food-placeholder.png
exercise-placeholder.png
---
# Navigation
The app should support **mobile-friendly navigation**.
Preferred layout:
Bottom navigation bar.
Example:
Home | Food | Workouts | Profile
Navigation rules:
- fixed to bottom
- thumb reachable
- icon + label
---
# UI Bug Fixing
When modifying UI, also fix common issues such as:
- broken alignment
- text overflow
- inconsistent spacing
- elements touching screen edges
- buttons too small for mobile
- poor responsiveness
---
# Component Architecture
Prefer reusable UI components.
Recommended components:
FoodCard
WorkoutCard
ExerciseItem
BottomNavigation
ImagePlaceholder
Reusable components help maintain UI consistency.
---
# Performance
UI changes should not degrade performance.
Avoid:
- unnecessary re-renders
- heavy layouts
- excessive DOM nesting
Prefer clean, efficient components.
---
# Code Style
Follow consistent structure.
Prefer:
- clear component separation
- readable code
- reusable UI patterns
- small focused components
Avoid large monolithic UI components.
---
# When Improving UI
Before making large UI changes:
1. Analyze the current layout
2. Identify UX problems
3. Propose improvements
4. Implement the improvements
Avoid random UI modifications.
Changes should be deliberate and structured.
---
# Expected Result
After improvements the application should feel like:
- a polished mobile fitness app
- visually modern
- easy to use
- production ready
- consistent across screens
Users should feel they are using a real product, not a prototype.
