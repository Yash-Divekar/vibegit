from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["explorer"])

@router.get("/api/explorer/navigate")
async def explorer_navigate(path: str = ""):
    import os
    import platform
    from pathlib import Path
    try:
        if not path or path == "undefined":
            if platform.system() == "Windows":
                import string
                from ctypes import windll
                drives = []
                bitmask = windll.kernel32.GetLogicalDrives()
                for letter in string.ascii_uppercase:
                    if bitmask & 1:
                        drives.append(f"{letter}:\\")
                    bitmask >>= 1
                return {
                    "current_path": "",
                    "parent_path": "",
                    "directories": drives
                }
            else:
                path = "/"
                
        p = Path(path)
        if not p.exists() or not p.is_dir():
            raise HTTPException(status_code=400, detail="Invalid directory path")
            
        directories = []
        for child in p.iterdir():
            try:
                if child.is_dir() and not child.name.startswith("."):
                    directories.append(child.name)
            except Exception:
                pass
                
        directories.sort(key=str.lower)
        
        try:
            parent = p.parent
            parent_path = parent.resolve().as_posix() if parent != p else ""
        except Exception:
            parent_path = ""
            
        return {
            "current_path": p.resolve().as_posix(),
            "parent_path": parent_path,
            "directories": directories
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
