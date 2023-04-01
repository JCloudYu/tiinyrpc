"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrimId = void 0;
/**
 *	Author: JCloudYu
 *	Create: 2020/06/28
**/
exports.TrimId = (() => {
    "use strict";
    // See http://www.isthe.com/chongo/tech/comp/fnv/#FNV-param for the definition of these parameters;
    const FNV_PRIME_HIGH = 0x0100, FNV_PRIME_LOW = 0x0193; // 16777619 0x01000193
    const OFFSET_BASIS = new Uint8Array([0xC5, 0x9D, 0x1C, 0x81]); // 2166136261 [0x81, 0x1C, 0x9D, 0xC5]
    const BASE32_MAP = "0123456789abcdefghijklmnopqrstuv".split('');
    const ENV = {
        SEQ: Math.floor(Math.random() * 0xFFFFFFFF),
        PID: 0, PPID: 0, MACHINE_ID: new Uint8Array(0)
    };
    if (typeof Buffer !== "undefined" && typeof process !== undefined) {
        ENV.MACHINE_ID = fnv1a32(UTF8Encode(require('os').hostname()));
        ENV.PID = process.pid;
        ENV.PPID = process.ppid;
    }
    else {
        let hostname = '';
        if (typeof window !== undefined) {
            hostname = window.location.host;
        }
        else {
            const HOSTNAME_CANDIDATES = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWZYZ_-";
            let count = 30;
            while (count-- > 0)
                hostname += HOSTNAME_CANDIDATES[(Math.random() * HOSTNAME_CANDIDATES.length) | 0];
        }
        ENV.MACHINE_ID = fnv1a32(UTF8Encode(hostname));
        ENV.PID = (Math.random() * 65535) | 0;
        ENV.PPID = (Math.random() * 65535) | 0;
    }
    return function GenTrimId() {
        const time = Date.now();
        const time_lower = time % 0xFFFFFFFF;
        const inc = (ENV.SEQ = (ENV.SEQ + 1) % 0xFFFFFFFF);
        const buff = new Uint8Array(14);
        const view = new DataView(buff.buffer);
        view.setUint32(0, time_lower, false); // [0-3] epoch time upper
        buff.set(ENV.MACHINE_ID, 4); // [4-7] machine id
        view.setUint16(8, ENV.PID, false); // [8-9] pid
        view.setUint32(10, inc, false); // [10-13] seq
        return Base32Encode(buff);
    };
    function Base32Encode(bytes) {
        if (bytes.length < 1)
            return '';
        // Run complete bundles
        let encoded = '';
        let begin, loop = Math.floor(bytes.length / 5);
        for (let run = 0; run < loop; run++) {
            begin = run * 5;
            encoded += BASE32_MAP[bytes[begin] >> 3]; // 0
            encoded += BASE32_MAP[(bytes[begin] & 0x07) << 2 | (bytes[begin + 1] >> 6)]; // 1
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x3E) >> 1]; // 2
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x01) << 4 | (bytes[begin + 2] >> 4)]; // 3
            encoded += BASE32_MAP[(bytes[begin + 2] & 0x0F) << 1 | (bytes[begin + 3] >> 7)]; // 4
            encoded += BASE32_MAP[(bytes[begin + 3] & 0x7C) >> 2]; // 5
            encoded += BASE32_MAP[(bytes[begin + 3] & 0x03) << 3 | (bytes[begin + 4] >> 5)]; // 6
            encoded += BASE32_MAP[bytes[begin + 4] & 0x1F]; // 7
        }
        // Run remains
        let remain = bytes.length % 5;
        if (remain === 0) {
            return encoded;
        }
        begin = loop * 5;
        if (remain === 1) {
            encoded += BASE32_MAP[bytes[begin] >> 3]; // 0
            encoded += BASE32_MAP[(bytes[begin] & 0x07) << 2]; // 1
        }
        else if (remain === 2) {
            encoded += BASE32_MAP[bytes[begin] >> 3]; // 0
            encoded += BASE32_MAP[(bytes[begin] & 0x07) << 2 | (bytes[begin + 1] >> 6)]; // 1
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x3E) >> 1]; // 2
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x01) << 4]; // 3
        }
        else if (remain === 3) {
            encoded += BASE32_MAP[bytes[begin] >> 3]; // 0
            encoded += BASE32_MAP[(bytes[begin] & 0x07) << 2 | (bytes[begin + 1] >> 6)]; // 1
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x3E) >> 1]; // 2
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x01) << 4 | (bytes[begin + 2] >> 4)]; // 3
            encoded += BASE32_MAP[(bytes[begin + 2] & 0x0F) << 1]; // 4
        }
        else if (remain === 4) {
            encoded += BASE32_MAP[bytes[begin] >> 3]; // 0
            encoded += BASE32_MAP[(bytes[begin] & 0x07) << 2 | (bytes[begin + 1] >> 6)]; // 1
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x3E) >> 1]; // 2
            encoded += BASE32_MAP[(bytes[begin + 1] & 0x01) << 4 | (bytes[begin + 2] >> 4)]; // 3
            encoded += BASE32_MAP[(bytes[begin + 2] & 0x0F) << 1 | (bytes[begin + 3] >> 7)]; // 4
            encoded += BASE32_MAP[(bytes[begin + 3] & 0x7C) >> 2]; // 5
            encoded += BASE32_MAP[(bytes[begin + 3] & 0x03) << 3]; // 6
        }
        return encoded;
    }
    function UTF8Encode(str) {
        if (typeof str !== "string") {
            throw new TypeError("Given input argument must be a js string!");
        }
        let codePoints = [];
        let i = 0;
        while (i < str.length) {
            let codePoint = str.codePointAt(i);
            if (codePoint === undefined)
                throw new RangeError("Given string cannot be encoded into utf8!");
            // 1-byte sequence
            if ((codePoint & 0xffffff80) === 0) {
                codePoints.push(codePoint);
            }
            // 2-byte sequence
            else if ((codePoint & 0xfffff800) === 0) {
                codePoints.push(0xc0 | (0x1f & (codePoint >> 6)), 0x80 | (0x3f & codePoint));
            }
            // 3-byte sequence
            else if ((codePoint & 0xffff0000) === 0) {
                codePoints.push(0xe0 | (0x0f & (codePoint >> 12)), 0x80 | (0x3f & (codePoint >> 6)), 0x80 | (0x3f & codePoint));
            }
            // 4-byte sequence
            else if ((codePoint & 0xffe00000) === 0) {
                codePoints.push(0xf0 | (0x07 & (codePoint >> 18)), 0x80 | (0x3f & (codePoint >> 12)), 0x80 | (0x3f & (codePoint >> 6)), 0x80 | (0x3f & codePoint));
            }
            i += (codePoint > 0xFFFF) ? 2 : 1;
        }
        return new Uint8Array(codePoints);
    }
    function fnv1a32(octets) {
        const U8RESULT = OFFSET_BASIS.slice(0);
        const U32RESULT = new Uint32Array(U8RESULT.buffer);
        const RESULT_PROC = new Uint16Array(U8RESULT.buffer);
        for (let i = 0; i < octets.length; i += 1) {
            U32RESULT[0] = U32RESULT[0] ^ octets[i];
            let hash_low = RESULT_PROC[0], hash_high = RESULT_PROC[1];
            RESULT_PROC[0] = hash_low * FNV_PRIME_LOW;
            RESULT_PROC[1] = hash_low * FNV_PRIME_HIGH + hash_high * FNV_PRIME_LOW + (RESULT_PROC[0] >>> 16);
        }
        return U8RESULT;
    }
})();
