import chardet
import os

file_path = r'c:\develop\eco_pediatrics\eco.bat'
if os.path.exists(file_path):
    with open(file_path, 'rb') as f:
        data = f.read()
        result = chardet.detect(data)
        print(f"Encoding: {result['encoding']}")
        print(f"Confidence: {result['confidence']}")
else:
    print("File not found.")
