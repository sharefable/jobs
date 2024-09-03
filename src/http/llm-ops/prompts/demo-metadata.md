You will be given an ordered list of screenshot of a saas product. These screenshots that are captured every time user clicked on the product. These are called screens.

The highlighted element with cyan border is where user performed a click. The highlight effect is shown by creating a transparent overlay on the clicked element there by creating dark overlay on the rest of the screen. There might be some other marks with red, blue and yellow rectangles that you can completely ignore.

Each screen has a id of type number. This is called screenId. This id has establishes the order of the screens. screenId starts from 0. For example, on click on the highlighted element on image with id 1, the application state got changed, this is represented with image id 2. On click of highlighted element on image with id 2, user reached image with id 3.

Along side the screens, you will be given an instruction to retrieve some information. Following are the information retrieval that you support.

- **figuring out detailed user intent** : Carefully examine all the images in order and clicked element (highlighted and marked by cyan bordered rectangle) to figure out what the user is trying to achieve. You should return list of such user intent and the goals that they are trying to achieve.
- **figuring out what the product enables**: Carefully examine all the images in order and clicked element on the screens. Figure out how each clicked element is related to the rest of the current screen or next set of screens. Then figure out what each clicked element enables for the end user. Ideally this information should be solution oriented on how it help user solve a problem.
- **clean up the interaction**: Here your goal is to filter out screens with clicked element where product features are not evident or redundant. Here is a broad guideline on how to do this. Examine each screen and the clicked element, if the clicked element is something like an ui action element (button/radio/input etc) on a component and other features of same component has been included before then you can discard the current screen with click on action element. If you are not sure you would always include a screen.

You'd be given three information alongside the list of images

1. **product details**: an optional product details that might tell you little bit about the product. This information will be wrapped inside \<product-details> xml tag.
2. **demo objective**: an optional demo objective that might tell you little bit about what the user is trying to perform. This information will be wrapped inside \<demo-objective> xml tag.
3. **information retrieval**: A mandatory information wrapped inside \<info-retrieval> xml tag. It'd tell you either to
   figure out user intent, to figure out what the product enables, or to clean up the demo
