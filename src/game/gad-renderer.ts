import SpriteLoader from "../sprite-loader";
import assert from "../util/assert";
import SliderSprite from "./ui/slider-sprite";
import VideoBaseTexture = PIXI.VideoBaseTexture;

type Callback = () => void;

interface RadioButtonData {
    sprite: PIXI.Sprite;
    defaultTexture: PIXI.Texture;
    activeTexture: PIXI.Texture;
}

export default class GADRenderer {
    private videos: PIXI.Sprite[] = [];

    constructor(private readonly stage: PIXI.Container, private readonly spriteLoader: SpriteLoader) { }

    public async render(data: any, callbacks: Callback[]) {
        this.destroyVideos();
        this.stage.removeChildren();

        const blockNumMapping: Map<number, string> = new Map();
        for (const name of Object.keys(data.variables)) {
            const value = data.variables[name];
            if (name.startsWith("BLK_")) {
                blockNumMapping.set(value, name.substring(4));
            }
        }

        const radioButtons: RadioButtonData[] = [];
        let selectableCount = 0;
        const gadgets = data.objects.GADGET.items;
        for (const num of Object.keys(gadgets)) {
            const gadget = gadgets[num];
            // const id = gadget.Id;
            const blockNr = gadget.Blocknr;
            const gfx = gadget.Gfxnr;
            const kind = gadget.Kind;
            const position = new PIXI.Point(gadget.Pos[0], gadget.Pos[1]);
            const size = gadget.Size !== undefined ? new PIXI.Point(gadget.Size.x, gadget.Size.y) : null;
            const selectable = gadget.Noselflg === undefined || gadget.Noselflg === 0;
            const pressOff = gadget.Pressoff;
            const isRadioButton = gadget.Reiheflg === 1;
            if (isRadioButton) {
                assert(selectable);
            }
            assert(blockNr !== undefined);

            const isSlider = gadget.Slidverflg !== undefined;
            const sliderOffset = gadget.Slidoffs;
            const sliderSize = gadget.Slidsize;

            switch (kind) {
                case "GAD_GFX":
                    const textures = await this.spriteLoader.getTextures(`TOOLS/${blockNumMapping.get(blockNr)}`);

                    const defaultTexture = textures.get(gfx);
                    const activeTexture = textures.get(gfx + pressOff);

                    const sprite = !isSlider ? new PIXI.Sprite(defaultTexture) : new SliderSprite(defaultTexture);
                    sprite.position.set(position.x, position.y);

                    if (isSlider) {
                        (sprite as SliderSprite).setSliderData(size.y, sliderOffset[1], sliderSize[1]);
                    }

                    if (selectable) {
                        sprite.buttonMode = true;
                        sprite.interactive = true;
                        const callback = callbacks[selectableCount];

                        if (isRadioButton) {
                            if (radioButtons.length === 0) {
                                // The first radio button is active at the start.
                                sprite.texture = activeTexture;
                            }
                            radioButtons.push({sprite, activeTexture, defaultTexture});
                        }

                        sprite.on("mousedown", () => {
                            sprite.texture = activeTexture;
                            if (isRadioButton) {
                                // If this IS a radio button, make all other radio buttons inactive.
                                for (const button of radioButtons) {
                                    if (button.sprite !== sprite) {
                                        button.sprite.texture = button.defaultTexture;
                                    }
                                }
                            }
                            callback();
                        });

                        if (!isRadioButton) {
                            // If this is NOT a radio button, go back to normal state on mouse up.
                            sprite.on("mouseup", () => sprite.texture = defaultTexture);
                        }

                        selectableCount++;
                    }
                    this.stage.addChild(sprite);
                    break;
                default:
                    console.warn(`Unsupported kind: ${kind}`);
            }
        }
    }

    public renderVideo(videoSprite: PIXI.Sprite) {
        // @ts-ignore
        const videoTexture: VideoBaseTexture = videoSprite.texture.baseTexture;
        videoTexture.source.addEventListener("ended", () => {
            this.stage.removeChild(videoSprite);
        }, {once: true});
        this.stage.addChild(videoSprite);
        this.videos.push(videoSprite);
    }

    public renderVideoFullscreen(videoSprite: PIXI.Sprite, onEnd: () => void) {
        this.destroyVideos();
        this.stage.removeChildren();

        // @ts-ignore
        const videoTexture: VideoBaseTexture = videoSprite.texture.baseTexture;
        videoTexture.source.addEventListener("ended", () => {
            this.stage.removeChild(videoSprite);
            onEnd();
        }, {once: true});

        videoSprite.scale.set(2, 2);

        // TODO: For some reason, this.stage.width/height are way to small.
        const x = (/*this.stage.width*/ 1024 / 2) - ((videoSprite.texture.width * videoSprite.scale.x) / 2);
        const y = (/*this.stage.height*/ 768 / 2) - ((videoSprite.texture.height * videoSprite.scale.y) / 2);
        videoSprite.position.set(x, y);

        this.stage.addChild(videoSprite);
    }

    private destroyVideos() {
        this.videos.forEach((video) => video.destroy({texture: true, baseTexture: true}));
        this.videos = [];
    }
}
