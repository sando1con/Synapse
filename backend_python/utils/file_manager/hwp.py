# utils/file_manager/hwp.py

import olefile
import zlib
import struct
import re
import subprocess

__all__ = ["extract_text", "extract_first_sentence"]

def extract_text(file_path):
    try:
        f = olefile.OleFileIO(file_path)
        dirs = f.listdir()

        if ["FileHeader"] not in dirs or ["\x05HwpSummaryInformation"] not in dirs:
            raise Exception("Not Valid HWP.")

        header = f.openstream("FileHeader")
        header_data = header.read()
        is_compressed = (header_data[36] & 1) == 1

        nums = []
        for d in dirs:
            if d[0] == "BodyText":
                nums.append(int(d[1][len("Section"):]))
        sections = ["BodyText/Section" + str(x) for x in sorted(nums)]

        text = ""
        for section in sections:
            bodytext = f.openstream(section)
            data = bodytext.read()
            unpacked_data = zlib.decompress(data, -15) if is_compressed else data

            section_text = ""
            i = 0
            size = len(unpacked_data)
            while i < size:
                header = struct.unpack_from("<I", unpacked_data, i)[0]
                rec_type = header & 0x3ff
                rec_len = (header >> 20) & 0xfff

                if rec_type in [67]:
                    rec_data = unpacked_data[i + 4:i + 4 + rec_len]
                    section_text += rec_data.decode('utf-16', errors='ignore')
                    section_text += "\n"
                i += 4 + rec_len

            text += section_text
            text += "\n"
        return text

    except Exception as e:
        print(f"[HWP Error] {file_path} → {e}")
        return ""

def extract_first_sentence(file_path):
    full = extract_text(file_path)
    parts = re.split(r"(?<=[.?!])\s+|\n", full)
    return parts[0].strip() if parts else ""
