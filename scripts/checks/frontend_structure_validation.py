"""Frontend-specific static architecture and styling checks."""

from __future__ import annotations

import json
import re
from pathlib import Path

WEB_IMPORT = re.compile(r"(?:from\s+|import\s*(?:\(\s*)?)[\"']([^\"']+)[\"']")


def import_targets(path: Path) -> list[str]:
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return []
    return WEB_IMPORT.findall(source)


def resolve_web_import(root: Path, source_file: Path, target: str) -> Path | None:
    source_root = root / "frontend" / "src"
    if target.startswith("@/"):
        return (source_root / target[2:]).resolve()
    if target.startswith("."):
        return (source_file.parent / target).resolve()
    return None


def path_is_within(path: Path, directory: Path) -> bool:
    try:
        path.relative_to(directory.resolve())
    except ValueError:
        return False
    return True


def validate_no_barrel_files(root: Path, errors: list[str]) -> None:
    source_root = root / "frontend" / "src"
    for filename in ("index.ts", "index.tsx"):
        for path in source_root.rglob(filename):
            errors.append(
                "Avoid barrel files because they hide dependency direction: "
                f"{path.relative_to(root)}"
            )


def validate_web_boundaries(root: Path, errors: list[str]) -> None:
    web_source = root / "frontend" / "src"
    low_level_layers = {
        "shared": ("app", "components", "features", "pages"),
        "components": ("app", "features", "pages"),
    }
    for layer, invalid_layers in low_level_layers.items():
        for path in (web_source / layer).rglob("*"):
            if not path.is_file() or path.suffix not in {".ts", ".tsx"}:
                continue
            for target in import_targets(path):
                resolved = resolve_web_import(root, path, target)
                if resolved is not None and any(
                    path_is_within(resolved, web_source / invalid_layer)
                    for invalid_layer in invalid_layers
                ):
                    errors.append(
                        f"{layer.title()} code imports a higher layer in "
                        f"{path.relative_to(root)}: {target}"
                    )

    for path in (web_source / "features").rglob("*"):
        if not path.is_file() or path.suffix not in {".ts", ".tsx"}:
            continue
        for target in import_targets(path):
            resolved = resolve_web_import(root, path, target)
            if resolved is not None and any(
                path_is_within(resolved, web_source / invalid_layer)
                for invalid_layer in ("app", "pages")
            ):
                errors.append(
                    f"Feature code imports a higher layer in {path.relative_to(root)}: {target}"
                )


def validate_frontend_styling(root: Path, errors: list[str]) -> None:
    source_root = root / "frontend" / "src"
    styles_root = source_root / "styles"

    for pattern in ("*.css", "*.sass"):
        for path in source_root.rglob(pattern):
            errors.append(
                f"Frontend source must use SCSS, not {path.suffix}: {path.relative_to(root)}"
            )

    deprecated_import = re.compile(r"@import\s+[\"']")
    for path in source_root.rglob("*.scss"):
        source = path.read_text(encoding="utf-8")
        if deprecated_import.search(source):
            errors.append(f"Use Sass @use instead of deprecated @import: {path.relative_to(root)}")
        if styles_root not in path.parents and not path.name.endswith(".module.scss"):
            errors.append(
                f"Styles outside frontend/src/styles must be SCSS Modules: {path.relative_to(root)}"
            )

    main_source = source_root / "main.tsx"
    if main_source.exists() and '"@/styles/main.scss"' not in main_source.read_text(
        encoding="utf-8"
    ):
        errors.append("frontend/src/main.tsx must import the single styles/main.scss entry")

    package_path = root / "frontend" / "package.json"
    lock_path = root / "frontend" / "package-lock.json"
    if not package_path.exists() or not lock_path.exists():
        return

    package = json.loads(package_path.read_text(encoding="utf-8"))
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    declared = package.get("devDependencies", {}).get("sass")
    locked_root = lock.get("packages", {}).get("", {}).get("devDependencies", {}).get("sass")
    locked_package = lock.get("packages", {}).get("node_modules/sass", {}).get("version")
    if not isinstance(declared, str):
        errors.append("frontend/package.json must declare Sass as a development dependency")
    elif declared != locked_root or declared != locked_package:
        errors.append("Sass version must match in package.json and package-lock.json")


def validate_github_pages_configuration(root: Path, errors: list[str]) -> None:
    required_snippets = {
        "frontend/config/vite.config.ts": ('base: "./"',),
        "frontend/src/app/router.tsx": ("createHashRouter",),
        "frontend/index.html": ('href="%BASE_URL%favicon.svg?v=',),
        ".github/workflows/deploy-pages.yml": (
            "VITE_STATIC_DEPLOYMENT:",
            "path: frontend/dist",
            "actions/deploy-pages@",
        ),
    }
    for relative_path, snippets in required_snippets.items():
        path = root / relative_path
        if not path.is_file():
            continue
        source = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in source:
                errors.append(
                    f"GitHub Pages configuration is missing {snippet!r} in {relative_path}"
                )
