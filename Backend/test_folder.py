import os
import json

def get_folder_structure(repo_id: str):
    base_path = os.path.join("./data/repos", repo_id)
    if not os.path.exists(base_path):
        return []

    structure = []
    # keep it simple, max 100 items so we don't bloat dynamo
    for root, dirs, files in os.walk(base_path):
        # normalize path
        rel_root = os.path.relpath(root, base_path).replace("\\", "/")
        if rel_root == ".":
            rel_root = ""
            
        unwanted = [d for d in dirs if d in {".git", "node_modules", "__pycache__", ".venv", "venv", "env", "dist", "build", ".next", ".nuxt", "vendor", "target"} or d.startswith(".")]
        for d in unwanted:
            dirs.remove(d)
        
        for d in dirs:
            dir_path = f"{rel_root}/{d}/" if rel_root else f"{d}/"
            structure.append({"name": dir_path, "type": "folder"})
            
        for f in files:
            if f.startswith("."): continue
            file_path = f"{rel_root}/{f}" if rel_root else f
            structure.append({"name": file_path, "type": "file"})
            
        if len(structure) > 150:
            structure = structure[:150]
            break

    # sort: folders first, then files
    structure.sort(key=lambda x: (x["type"] != "folder", x["name"]))
    return structure

print(json.dumps(get_folder_structure("rm_94596ed958774024a670411dc37134ec"), indent=2))
