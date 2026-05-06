export class YjsUtil {
  static isEmpty(encoded: Uint8Array) {
    return encoded.length === 2 && encoded[0] === 0 && encoded[1] === 0
  }
}
