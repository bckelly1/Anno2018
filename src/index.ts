import * as log from "loglevel";
import { Viewport } from "pixi-viewport";
import {
  Application,
  MIPMAP_MODES,
  Point,
  Rectangle,
  SCALE_MODES,
  settings
} from "pixi.js";
import FileSystem from "./filesystem";
import GameLoader from "./game-loader";
import AnimationRenderer from "./game/animation-renderer";
import ConfigLoader from "./game/config-loader";
import FontLoader from "./game/font-loader";
import GADRenderer from "./game/gad-renderer";
import IslandRenderer from "./game/island-renderer";
import IslandSpriteLoader from "./game/island-sprite-loader";
import MenuStructure from "./game/menu-structure";
import MusicPlayer from "./game/music-player";
import { islandFromSaveGame } from "./game/world/island";
import { Block } from "./parsers/GAM/block";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import SpriteLoader from "./sprite-loader";
import UploadHandler from "./upload";
import { getQueryParameter } from "./util/util";
import { Translator } from "./translation/translator";

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  log.enableAll();

  const style = document.createElement("style");
  style.innerText = `
        body, html {
            margin: 0;
        }
    `;
  const game = document.createElement("div");
  game.id = "game";
  const version = document.createElement("p");
  version.innerHTML = `Anno 2018, version ${__VERSION__},
                         made by <a href="https://github.com/cmfcmf">@cmfcmf</a>.
                         The sourcecode can be found at <a href="https://github.com/cmfcmf/Anno2018">GitHub</a>.`;

  document.head.appendChild(style);
  document.body.appendChild(game);
  document.body.appendChild(version);

  const fs = new FileSystem();
  const FS_SIZE_MB = 2000;
  await fs.init(1024 * 1024 * FS_SIZE_MB);
  (window as any).fs = fs;

  const uploadHandler = new UploadHandler(fs);
  await uploadHandler.init();
  uploadHandler.render(game);

  if (!(await uploadHandler.isUploaded())) {
    console.warn("Anno 1602 files not yet uploaded.");
    return;
  }

  // utils.skipHello();
  settings.SCALE_MODE = SCALE_MODES.NEAREST;
  settings.MIPMAP_TEXTURES = MIPMAP_MODES.OFF;
  // settings.RENDER_OPTIONS.antialias = false;

  const app = new Application({
    width: window.innerWidth,
    height: window.innerHeight - 120,
    antialias: false,
    transparent: false
  });
  game.insertAdjacentElement("afterbegin", app.view);

  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    passiveWheel: false
  });
  app.stage.addChild(viewport);

  viewport
    .drag({ direction: "all", wheel: false })
    .wheel()
    .mouseEdges({ distance: 20, speed: 15 });

  const menuViewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: 1024,
    worldHeight: 768
  });
  app.stage.addChild(menuViewport);

  const translator = new Translator(fs);
  await translator.loadTranslations();

  const fontLoader = new FontLoader(fs);
  await fontLoader.load();

  const configLoader = new ConfigLoader(fs);
  await configLoader.load();
  console.log(`Finished loading config.`);

  const musicPlayer = new MusicPlayer(fs);
  await musicPlayer.load();
  console.log(`Finished loading music.`);

  const spriteLoader = new SpriteLoader(fs);
  const islandLoader = new IslandLoader(fs, configLoader.getFieldData());

  const animationData = JSON.parse(
    await fs.openAndGetContentAsText("/animations.json")
  );
  const animationRenderer = new AnimationRenderer(animationData, spriteLoader);

  const gamParser = new GAMParser(islandLoader);
  const islandSpriteLoader = new IslandSpriteLoader(
    configLoader,
    spriteLoader,
    animationRenderer
  );

  const gadRenderer = new GADRenderer(spriteLoader);
  const menuStructure = new MenuStructure(
    fs,
    gadRenderer,
    musicPlayer,
    translator
  );
  const gameLoader = new GameLoader(
    fs,
    gamParser,
    islandSpriteLoader,
    app,
    viewport,
    configLoader,
    musicPlayer,
    animationRenderer,
    menuStructure,
    translator,
    spriteLoader
  );

  const queryGameName = getQueryParameter("load");
  const gad = getQueryParameter("gad");
  const animationName = getQueryParameter("animation");
  const islandName = getQueryParameter("island");
  if (queryGameName !== null) {
    await gameLoader.loadByName(queryGameName);
    // eslint-disable-next-line require-atomic-updates
    menuViewport.visible = false;
  } else if (gad !== null) {
    console.info(`Rendering "${gad}" screen.`);
    for (const gadName of gad.split(",")) {
      await menuStructure.renderScreen(menuViewport, gadName);
    }
  } else if (animationName !== null) {
    console.log(`Rendering animation "${animationName}".`);
    await animationRenderer.renderAnimation(animationName, viewport);
  } else if (islandName !== null) {
    console.info(`Rendering island "${islandName}".`);
    const islandFile = await islandLoader.loadIslandFileByName(islandName);

    const blocks: Block[] = [];
    while (!islandFile.eof()) {
      blocks.push(Block.fromStream(islandFile));
    }
    console.table(blocks);

    const island = islandFromSaveGame(
      blocks.find(block => ["INSEL5", "INSEL4", "INSEL3"].includes(block.type))!
        .data
    );
    islandLoader.setIslandFields(island, [
      blocks.find(block => block.type === "INSELHAUS")!
    ]);
    island.position = new Point(0, 0);
    island.positionRect = new Rectangle(0, 0, island.size.x, island.size.y);

    // eslint-disable-next-line require-atomic-updates
    menuViewport.visible = false;
    const islandRenderer = new IslandRenderer(viewport, islandSpriteLoader);
    await islandRenderer.render([island]);
  } else {
    // menuViewport.fit(); // TODO: Makes usage of sliders harder
    menuStructure.on("load-game", async (mission: string) => {
      await gameLoader.load(mission);
      menuViewport.visible = false;
    });
    await menuStructure.renderScreen(menuViewport, "menu_main");
  }
})();
