from PIL import Image, ImageOps, ImageFilter


def make_black_transparent_logo(input_path, output_path):
    """
    Converts a white logo on a dark background into a black logo on a transparent background,
    applying anti-aliasing to smooth the edges and resizing with high quality.
    """
    # 1. Open the image
    img = Image.open(input_path)

    # 2. Calculate aspect ratio and new dimensions
    target_width, target_height = 600, 300
    aspect_ratio = img.width / img.height

    if aspect_ratio > (target_width / target_height):
        # Image is wider than target ratio
        new_width = target_width
        new_height = int(target_width / aspect_ratio)
    else:
        # Image is taller than target ratio
        new_height = target_height
        new_width = int(target_height * aspect_ratio)

    # 3. High quality resize before any color operations
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # 4. Convert to grayscale after resize
    img_gray = img_resized.convert("L")

    # 5. Invert the grayscale image so the logo is black and the background is white
    img_inverted = ImageOps.invert(img_gray)

    # 6. Apply a slight Gaussian blur for anti-aliasing
    img_smooth = img_inverted.filter(ImageFilter.GaussianBlur(0.5))

    # 7. Convert to RGBA (for transparency)
    rgba = Image.new("RGBA", img_smooth.size, (0, 0, 0, 0))
    pixels = rgba.load()
    smoothed_pixels = img_smooth.load()

    # 8. Threshold-based transparency with improved anti-aliasing
    threshold = 128
    for y in range(new_height):
        for x in range(new_width):
            alpha = smoothed_pixels[x, y]
            if alpha > threshold:
                pixels[x, y] = (0, 0, 0, 0)  # Transparent
            else:
                # Improved alpha calculation for smoother edges
                alpha_value = int(255 * (1 - alpha / 255))
                pixels[x, y] = (0, 0, 0, alpha_value)

    # 9. If needed, center the image in the target dimensions with padding
    if new_width != target_width or new_height != target_height:
        final_img = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
        paste_x = (target_width - new_width) // 2
        paste_y = (target_height - new_height) // 2
        final_img.paste(rgba, (paste_x, paste_y))
        rgba = final_img

    # 10. Save the result as a PNG with transparency
    rgba.save(output_path, "PNG", quality=95)


if __name__ == "__main__":
    make_black_transparent_logo("public/logo.png", "public/logo_transparent.png")
