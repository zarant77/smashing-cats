export type AssetMap = Record<string, string>;

export type AssetManifest = {
  images?: AssetMap;
  audio?: AssetMap;
  models?: AssetMap;
};
