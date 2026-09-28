# UI and installed-app review

Updated 27 September 2026. These observed interactions are separate from ordinary progression and unit tests.

## Browser input pass

The game ran at 1280×720 through the normal canvas and DOM UI. Controlled saves were imported through the visible save dialog; browser-side game state was not injected.

- Import save works with keyboard focus and Enter. The hidden-input label was replaced with a real button.
- Orange seed placement emptied its slot and displayed the seedling.
- Hatchet crafting completed: wood 60→50, stone 20→18, hatchet in the empty slot.
- Firepit Add 5 consumed five wood. Two smelts consumed four iron and produced two shaped metal. Collection with full inventory retained the output; collection succeeded after the second craft freed a slot.
- Food aged throughout. Inventory and recipe controls retained DOM identity across freshness and timer updates. Dragging slot 2 onto slot 3 swapped hatchet and repair hammer correctly.
- Mouse-wheel zoom changed world scale while keeping the HUD legible.
- Earlier in the same fixture, wall placement consumed one wall; repair consumed one nail and restored the damaged appearance; a switch lit its connected cable and lamp. Feeder hunger and fire warmth rose to 255.
- The death dialog offered ordinary respawn and bag revival. Bag revival retained level 35 / 135,000 XP / 8 points, restored the survivor at the bag position, consumed the bag and left death inventory in the world.
- Medicine timers/healing, RadAway, Lapadone, two-way chest transfer, clothing changes and ordinary half-level respawning were exercised in the preceding UI pass.

## Installed offline persistence

On 26 September, the NSIS installation exited successfully. The game launched with `--offline`; its desktop log confirmed application networking was offline.

A normal two-stone world was saved as **Offline Windows acceptance** in manual slot 1 at age 1:18, level 0, health 255, hunger 162. The app was closed and reinstalled. After relaunch the slot name and preview remained. Loading restored the world; after roughly nine active seconds its age was 1:27 and hunger 151. Several minutes spent closed did not advance the world.

The final 27 September package also passed. Installation exited zero and the installed application archive exactly matched the packaged archive. The offline app retained manual slot 1, loaded it at the saved time, accepted keyboard crafting and wrote **Final Windows release check** to empty manual slot 2 at age 2:07, level 0, health 255, hunger 103, warmth/energy 255 and radiation 0. After a clean close and more than five hours closed, the offline app retained slot 2 and loaded it with two stones, health 255 and no closed-time advancement. At the next observation, approximately seven active seconds had elapsed (dusk in 5:45–5:46, hunger 94–95). The game was then left paused.

Native file-picker automation previously failed to target the File name field; browser import behavior was verified separately. This tool limitation is not represented as a passed native file-picker check.
