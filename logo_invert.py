from PIL import Image, ImageOps, ImageFilter


def make_black_transparent_logo(input_path, output_path):
    """
    Converts a white logo on a dark background into a black logo on a transparent background,
    applying anti-aliasing to smooth the edges.
    """
    # 1. Open the image and convert to grayscale
    img = Image.open(input_path).convert("L")

    # 2. Invert the grayscale image so the logo is black and the background is white
    img_inverted = ImageOps.invert(img)

    # 3. Apply a slight Gaussian blur for anti-aliasing
    img_smooth = img_inverted.filter(
        ImageFilter.GaussianBlur(1)
    )  # Adjust blur level as needed

    # 4. Convert to RGBA (for transparency)
    rgba = Image.new("RGBA", img_smooth.size, (0, 0, 0, 0))
    pixels = rgba.load()
    smoothed_pixels = img_smooth.load()

    # 5. Threshold-based transparency: dark pixels become black, bright pixels become transparent
    threshold = 128  # You can tweak this value if needed
    width, height = img_smooth.size
    for y in range(height):
        for x in range(width):
            alpha = smoothed_pixels[x, y]  # Use smoothed intensity as alpha level
            if alpha > threshold:
                pixels[x, y] = (0, 0, 0, 0)  # Transparent
            else:
                pixels[x, y] = (
                    0,
                    0,
                    0,
                    255 - alpha,
                )  # Black with anti-aliased transparency

    # 6. Save the result as a PNG with transparency
    rgba.save(output_path)


if __name__ == "__main__":
    make_black_transparent_logo("public/logo.png", "public/logo_black_transparent.png")
