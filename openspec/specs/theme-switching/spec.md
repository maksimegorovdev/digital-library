# theme-switching Specification

## Purpose

Lets users choose the frontend's visual appearance — Light, Dark, or System — via the `lyra` shadcn/ui style preset and a header toggle, with the choice persisting across reloads and defaulting to the operating system's preference.

## Requirements

### Requirement: Lyra shadcn style preset
The frontend SHALL use the `lyra` shadcn/ui style preset (`base-lyra`) as its primary style, applied to all installed UI components.

#### Scenario: Installed components reflect the Lyra style
- **WHEN** the `lyra` preset is applied
- **THEN** `components.json` SHALL record `lyra` as the active style and the installed `button` and `card` components SHALL render using Lyra's theme tokens

### Requirement: Light and dark theme tokens
The frontend SHALL define both a light and a dark set of theme tokens, applied via a `dark` class on the `<html>` element.

#### Scenario: Dark class applied
- **WHEN** the active theme is dark
- **THEN** the `<html>` element SHALL have the `dark` class and components SHALL render using the dark token values from `globals.css`

#### Scenario: Light class absent
- **WHEN** the active theme is light
- **THEN** the `<html>` element SHALL NOT have the `dark` class and components SHALL render using the light token values

### Requirement: Theme provider with system-preference support
The app SHALL wrap its content in a theme provider that supports `light`, `dark`, and `system` modes, defaulting to `system`.

#### Scenario: Default theme follows OS preference
- **WHEN** a user visits the app for the first time with no stored theme preference
- **THEN** the app SHALL render using the theme matching the operating system's color-scheme preference

#### Scenario: No hydration warning
- **WHEN** the app is server-rendered and then hydrated on the client
- **THEN** no theme-related hydration-mismatch warning SHALL be logged to the console

### Requirement: Theme toggle in header
The app SHALL render a header containing the project name and a theme toggle control offering Light, Dark, and System options.

#### Scenario: Selecting a theme from the toggle
- **WHEN** a user opens the theme toggle and selects "Dark"
- **THEN** the app SHALL immediately switch to the dark theme without a full page reload

#### Scenario: Theme choice persists across reloads
- **WHEN** a user selects a theme and then reloads the page
- **THEN** the app SHALL render using the previously selected theme instead of reverting to the system default
