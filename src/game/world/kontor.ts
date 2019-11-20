/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point } from "pixi.js";
import Stream from "../../parsers/stream";
import Good from "./good";
import { GoodIds } from "../field-type";

export type Kontor = ReturnType<typeof kontorFromSaveGame>;

export function kontorFromSaveGame(data: Stream) {
  const islandId = data.read8();
  const position = new Point(data.read8(), data.read8());
  const playerId = data.read8();
  const goods = parseGoods(data);

  return {
    islandId,
    position,
    playerId,
    goods
  };
}

function parseGoods(data: Stream) {
  const goods = [];
  for (let i = 0; i < 2; i++) {
    // NOWARE, ALLWARE
    Good.fromSaveGame(data);
  }
  for (let i = 2; i < 2 + 23; i++) {
    goods.push(Good.fromSaveGame(data, GoodIds.NOWARE + i));
  }
  for (let i = 2 + 23; i < 50; i++) {
    // wSOLDAT1, wSOLDAT2, ..., SCHATZ
    Good.fromSaveGame(data);
  }
  return goods;
}
