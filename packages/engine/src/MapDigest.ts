import { Crc32 } from "@ra2/data/Crc32";
export class MapDigest {
    static compute(data: {
        getBytes(): Uint8Array;
    }): string {
        return Crc32.calculateCrc(data.getBytes()).toString(16);
    }
}
