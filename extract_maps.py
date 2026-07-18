import json
import os

def extract(map_file, target_file, out_name):
    with open(map_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for idx, source in enumerate(data.get('sources', [])):
        if target_file in source:
            content = data['sourcesContent'][idx]
            with open(out_name, 'w', encoding='utf-8') as out:
                out.write(content)
            print(f"Extracted {source} to {out_name}")
            return
    print(f"Could not find {target_file} in {map_file}")

extract(r'D:\Webapp CDE-HTKT\webapp\.next\server\chunks\ssr\src_app_page_1vqfk0-.js.map', 'page.js', r'D:\Webapp CDE-HTKT\webapp\src\app\page_recovered.js')
extract(r'D:\Webapp CDE-HTKT\webapp\.next\server\chunks\ssr\src_components_FolderTree_jsx_1r61e1s._.js.map', 'FolderTree.jsx', r'D:\Webapp CDE-HTKT\webapp\src\components\FolderTree_recovered.jsx')
