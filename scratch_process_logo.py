from PIL import Image

def process_logo():
    try:
        img = Image.open('public/wordmark.png').convert("RGBA")
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    datas = img.getdata()

    navy_data = []
    white_data = []

    for item in datas:
        r, g, b, a = item
        
        # Make white background transparent
        if r > 230 and g > 230 and b > 230:
            navy_data.append((255, 255, 255, 0))
            white_data.append((255, 255, 255, 0))
        else:
            # Keep original colors for the navy version
            navy_data.append(item)
            
            # For the white version, we want the logo to be entirely white so it's visible on dark backgrounds
            # EXCEPT for the banner "Connecting with Legal Updates" which has white text.
            # But making it a solid white silhouette actually looks very premium and standard for dark modes.
            # If we make it solid white, the transparent text inside the banner would show the dark background, making it legible!
            # Wait, the banner text is currently white, not transparent. If we make the banner background white, it becomes white-on-white.
            # Let's invert the color mathematically to preserve contrast:
            # Invert RGB, keep Alpha.
            inv_r = 255 - r
            inv_g = 255 - g
            inv_b = 255 - b
            
            # If it was dark navy/black, it becomes light/white.
            # If it was white text, it becomes black (which is fine on a white banner, wait, banner becomes white, text becomes black. Perfect!)
            white_data.append((inv_r, inv_g, inv_b, a))

    navy_img = Image.new("RGBA", img.size)
    navy_img.putdata(navy_data)
    navy_img.save("public/wordmark_navy.png", "PNG")

    white_img = Image.new("RGBA", img.size)
    white_img.putdata(white_data)
    white_img.save("public/wordmark_white.png", "PNG")
    print("Logos processed successfully.")

if __name__ == "__main__":
    process_logo()
