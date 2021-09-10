"""Page blocks"""

from wagtail.core import blocks
from wagtail.images.blocks import ImageChooserBlock


class CourseTeamBlock(blocks.StructBlock):
    """
    Block class that defines a course team member
    """

    name = blocks.CharBlock(max_length=100, help_text="Name of the course team member.")
    title = blocks.RichTextBlock(
        required=False,
        features=["bold", "italic"],
        help_text="Title of the course team member."
    )
    bio = blocks.TextBlock(help_text="Short bio of course team member.")
    image = ImageChooserBlock(
        help_text='Image for the faculty member. Should be 385px by 385px.'
    )


class ImageWithLinkBlock(blocks.StructBlock):
    """ Image with a clickable link on it """
    image = ImageChooserBlock(label="Image", required=True, help_text="The image to display.")
    link = blocks.URLBlock(
        label="Link",
        required=True,
        help_text="Absolute URL to the image, like https://example.com/some_image.jpg"
    )
    align = blocks.ChoiceBlock(
        choices=[('center', 'Center'), ('right', 'Right'), ('left', 'Left')],
        default='left',
        max_length=10,
    )
    width = blocks.IntegerBlock(required=False)
    height = blocks.IntegerBlock(required=False)

    class Meta:
        template = 'cms/imagewithlink.html'
        form_classname = 'ImageWithLinkBlock'
        icon = 'picture'

class ResourceBlock(blocks.StructBlock):
    """
    A custom block for resource pages.
    """

    heading = blocks.CharBlock(max_length=100)
    detail = blocks.RichTextBlock()
