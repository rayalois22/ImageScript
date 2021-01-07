var ImageScript;ImageScript=(()=>{var t={655:(t,e,r)=>{const n=r(347),i=r(723),s=r(876),o=r(327),a=r(76),h=r(667);class _{constructor(t,e){if(e=~~e,(t=~~t)<1)throw new RangeError("Image has to be at least 1 pixel wide");if(e<1)throw new RangeError("Image has to be at least 1 pixel high");this.__width__=t,this.__height__=e,this.__buffer__=new ArrayBuffer(t*e*4),this.__view__=new DataView(this.__buffer__),this.__u32__=new Uint32Array(this.__buffer__),this.bitmap=new Uint8ClampedArray(this.__buffer__)}toString(){return`Image<${this.width}x${this.height}>`}static new(t,e){return new this(t,e)}get width(){return this.__width__}get height(){return this.__height__}*[Symbol.iterator](){for(let t=1;t<=this.height;t++)for(let e=1;e<=this.width;e++)yield[e,t]}*iterateWithColors(){let t=0;for(let e=1;e<=this.height;e++)for(let r=1;r<=this.width;r++)yield[r,e,this.__view__.getUint32(t,!1)],t+=4}static rgbaToColor(t,e,r,n){return((255&t)<<24|(255&e)<<16|(255&r)<<8|255&n)>>>0}static rgbToColor(t,e,r){return _.rgbaToColor(t,e,r,255)}static hslaToColor(t,e,r,n){let i,s,o;if(t%=1,e=Math.min(1,Math.max(0,e)),r=Math.min(1,Math.max(0,r)),n=Math.min(1,Math.max(0,n)),0===e)i=s=o=r;else{const n=(t,e,r)=>(r<0&&(r+=1),r>1&&(r-=1),r<1/6?t+6*(e-t)*r:r<.5?e:r<2/3?t+(e-t)*(2/3-r)*6:t),a=r<.5?r*(1+e):r+e-r*e,h=2*r-a;i=n(h,a,t+1/3),s=n(h,a,t),o=n(h,a,t-1/3)}return _.rgbaToColor(255*i,255*s,255*o,255*n)}static hslToColor(t,e,r){return _.hslaToColor(t,e,r,1)}static rgbaToHSLA(t,e,r,n){t/=255,e/=255,r/=255;const i=Math.max(t,e,r),s=Math.min(t,e,r);let o,a,h=(i+s)/2;if(i===s)o=a=0;else{const n=i-s;switch(a=h>.5?n/(2-i-s):n/(i+s),i){case t:o=(e-r)/n+(e<r?6:0);break;case e:o=(r-t)/n+2;break;case r:o=(t-e)/n+4}o/=6}return[o,a,h,n/255]}static colorToRGBA(t){return[t>>24&255,t>>16&255,t>>8&255,255&t]}static colorToRGB(t){return _.colorToRGBA(t).slice(0,3)}getPixelAt(t,e){return this.__check_boundaries__(t,e),this.__view__.getUint32((~~e-1)*this.width+(~~t-1),!1)}getRGBAAt(t,e){this.__check_boundaries__(t,e);const r=4*((~~e-1)*this.width+(~~t-1));return this.bitmap.subarray(r,r+4)}setPixelAt(t,e,r){return t=~~t,e=~~e,this.__check_boundaries__(t,e),this.__set_pixel__(t,e,r),this}__set_pixel__(t,e,r){this.__view__.setUint32(4*((e-1)*this.width+(t-1)),r,!1)}__check_boundaries__(t,e){if(isNaN(t))throw new TypeError(`Invalid pixel coordinates (x=${t})`);if(isNaN(e))throw new TypeError(`Invalid pixel coordinates (y=${e})`);if(t<1)throw new RangeError(`${_.__out_of_bounds__} (x=${t})<1`);if(t>this.width)throw new RangeError(`${_.__out_of_bounds__} (x=${t})>(width=${this.width})`);if(e<1)throw new RangeError(`${_.__out_of_bounds__} (y=${e})<1`);if(e>this.height)throw new RangeError(`${_.__out_of_bounds__} (y=${e})>(height=${this.height})`)}static get __out_of_bounds__(){return"Tried referencing a pixel outside of the images boundaries:"}fill(t){if("function"!=typeof t)this.__view__.setUint32(0,t,!1),this.__u32__.fill(this.__u32__[0]);else{let e=0;for(let r=1;r<=this.height;r++)for(let n=1;n<=this.width;n++)this.__view__.setUint32(e,t(n,r),!1),e+=4}return this}clone(){const t=_.new(this.width,this.height);return t.bitmap.set(this.bitmap),t}static get RESIZE_NEAREST_NEIGHBOR(){return"RESIZE_NEAREST_NEIGHBOR"}static get RESIZE_AUTO(){return-1}scale(t,e=_.RESIZE_NEAREST_NEIGHBOR){return 1===t?this:this.resize(this.width*t,this.height*t,e)}resize(t,e,r=_.RESIZE_NEAREST_NEIGHBOR){if(t===_.RESIZE_AUTO&&e===_.RESIZE_AUTO)throw new Error("RESIZE_AUTO can only be used for either width or height, not for both");if(t===_.RESIZE_AUTO?t=this.width/this.height*e:e===_.RESIZE_AUTO&&(e=this.height/this.width*t),t=Math.floor(t),e=Math.floor(e),t<1)throw new RangeError("Image has to be at least 1 pixel wide");if(e<1)throw new RangeError("Image has to be at least 1 pixel high");if(r===_.RESIZE_NEAREST_NEIGHBOR)return this.__resize_nearest_neighbor__(t,e);throw new Error("Invalid resize mode")}__resize_nearest_neighbor__(t,e){const r=new this.constructor(t,e);for(let n=0;n<e;n++)for(let i=0;i<t;i++){const s=Math.floor(n*this.height/e),o=Math.floor(i*this.width/t),a=4*(n*t+i),h=4*(s*this.width+o);r.__view__.setUint32(a,this.__view__.getUint32(h,!1),!1)}return this.__apply__(r),this}crop(t,e,r,n){return r>this.width&&(r=this.width),n>this.height&&(n=this.height),this.__apply__(this.__crop__(t,e,r,n))}__crop__(t,e,r,n){t=~~t,e=~~e;const i=new this.constructor(r,n);for(let s=0;s<n;s++){const n=(s+e)*this.width+t;i.__u32__.set(this.__u32__.subarray(n,n+r),s*r)}return i}drawBox(t,e,r,n,i){if(t-=1,e-=1,"function"!=typeof i)return this.__fast_box__(t,e,r,n,i);for(let s=1;s<=n;s++)for(let n=1;n<=r;n++){const r=n+t,o=s+e;if(Math.min(r,o)<1||r>this.width||o>this.height)continue;const a=i(n,s);this.__set_pixel__(r,o,a)}return this}__fast_box__(t,e,r,n,i){t<0&&(r+=t,t=1),e<0&&(n+=e,e=1);const s=Math.max(Math.min(t+r,this.width),1);let o=s;for(;t<=--o;)this.__view__.setUint32(4*(o+e*this.width),i);const a=4*(s+e*this.width),h=4*(t+e*this.width);let _=Math.max(Math.min(e+n,this.height),1);for(;e<--_;)this.bitmap.copyWithin(4*(t+_*this.width),h,a);return this}drawCircle(t,e,r,n){const i=r**2;for(let s=Math.max(1,e-r);s<=Math.min(e+r,this.height);s++)for(let o=Math.max(1,t-r);o<=Math.min(t+r,this.width);o++)(o-t)**2+(s-e)**2<i&&this.__set_pixel__(o,s,"function"==typeof n?n(o-t+r,s-e+r):n);return this}cropCircle(t=!1,e=0){const r=(Math[t?"max":"min"](this.width,this.height)/2)**2,n=this.width/2,i=this.height/2;for(const[t,s]of this){const o=(t-n)**2+(s-i)**2,a=4*((s-1)*this.width+(t-1))+3;o>r?this.bitmap[a]=0:e&&(this.bitmap[a]*=Math.max(0,Math.min(1,1-o/r*e**.5)))}return this}opacity(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid opacity value");return this.__set_channel_value__(t,e,3),this}red(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid saturation value");return this.__set_channel_value__(t,e,0),this}green(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid saturation value");return this.__set_channel_value__(t,e,1),this}blue(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid saturation value");return this.__set_channel_value__(t,e,2),this}__set_channel_value__(t,e,r){for(let n=r;n<this.bitmap.length;n+=4)this.bitmap[n]=t*(e?255:this.bitmap[n])}lightness(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid lightness value");return this.fill(((r,n)=>{const[i,s,o,a]=_.rgbaToHSLA(...this.getRGBAAt(r,n));return _.hslaToColor(i,s,t*(e?1:o),a)}))}saturation(t,e=!1){if(isNaN(t)||t<0)throw new RangeError("Invalid saturation value");return this.fill(((r,n)=>{const[i,s,o,a]=_.rgbaToHSLA(...this.getRGBAAt(r,n));return _.hslaToColor(i,t*(e?1:s),o,a)}))}composite(t,e=0,r=0){e=~~e,r=~~r;for(let n=0;n<t.height;n++){let i=r+n;if(!(i<0)){if(i>=this.height)break;for(let r=0;r<t.width;r++){let s=e+r;if(s<0)continue;if(s>=this.width)break;const o=4*(s+i*this.width),a=t.__view__.getUint32(4*(r+n*t.width),!1),h=this.__view__.getUint32(o,!1);255==(255&a)?this.__view__.setUint32(o,a,!1):0==(255&a)?this.__view__.setUint32(o,h,!1):this.__view__.setUint32(o,_.__alpha_blend__(a,h),!1)}}}return this}static __alpha_blend__(t,e){const r=255&t,n=r+1,i=256-r;return(255&n*(t>>>24)+i*(e>>>24)>>8)<<24|(255&n*(t>>16&255)+i*(e>>16&255)>>8)<<16|(255&n*(t>>8&255)+i*(e>>8&255)>>8)<<8|255&Math.max(r,255&e)}invert(){for(const[t,e,r]of this.iterateWithColors())this.__set_pixel__(t,e,4294967295-r&4294967040|255&r);return this}invertValue(){for(const[t,e,r]of this.iterateWithColors()){const[n,i,s,o]=_.rgbaToHSLA(..._.colorToRGBA(r));this.__set_pixel__(t,e,_.hslaToColor(n,i,1-s,o))}return this}invertSaturation(){for(const[t,e,r]of this.iterateWithColors()){const[n,i,s,o]=_.rgbaToHSLA(..._.colorToRGBA(r));this.__set_pixel__(t,e,_.hslaToColor(n,1-i,s,o))}return this}invertHue(){for(const[t,e,r]of this.iterateWithColors()){const[n,i,s,o]=_.rgbaToHSLA(..._.colorToRGBA(r));this.__set_pixel__(t,e,_.hslaToColor(1-n,i,s,o))}return this}hueShift(t){for(const[e,r,n]of this.iterateWithColors()){const[i,s,o,a]=_.rgbaToHSLA(..._.colorToRGBA(n));this.__set_pixel__(e,r,_.hslaToColor(i+t/360,s,o,a))}return this}averageColor(){let t=[0,0,0],e=0;for(let r=0;r<this.bitmap.length;r+=4){const n=this.bitmap.subarray(r,r+4);for(let e=0;e<3;e++)t[e]+=n[e];e+=n[3]/255}return _.rgbaToColor(...t.map((t=>t/e)),255)}dominantColor(t=!0,e=!0,r=15){const n=new Array(262143);for(let i=0;i<this.bitmap.length;i+=4){const s=this.__view__.getUint32(i,!1),[o,a,h]=_.rgbaToHSLA(..._.colorToRGBA(s)).map((t=>~~(63*t)));if(t&&h<r)continue;if(e&&h>63-r)continue;const l=o<<12|a<<6|h;n[l]=(n[l]||0)+1}let i=-1,s=0;if(n.forEach(((t,e)=>{t<i||(i=t,s=e)})),-1===s)return this.dominantColor(t,e,r-1);const o=s>>>12&63,a=s>>>6&63,h=63&s;return _.hslaToColor(o/63,a/63,h/63,1)}rotate(t,e=!0){if(t%360==0)return this;if(t%180==0)return this.__rotate_180__();const r=Math.PI*(t/180),n=Math.sin(r),i=Math.cos(r),s=e?Math.abs(this.width*n)+Math.abs(this.height*i):this.width,o=e?Math.abs(this.width*i)+Math.abs(this.height*n):this.height,a=_.new(s,o),h=s/2-.5,l=o/2-.5,f=this.width/2-.5,u=this.height/2-.5;let c=0;do{let t=0;const e=f-n*(c-l),r=u+i*(c-l);do{const s=e+i*(t-h),o=r+n*(t-h);_.__interpolate__(this,a,t,c,s,o)}while(t++<s)}while(c++<o);return this.__apply__(a)}__rotate_180__(){let t=0;for(this.bitmap.reverse();t<this.bitmap.length;)this.bitmap.subarray(t,t+=4).reverse();return this}static __interpolate__(t,e,r,n,i,s){const o=~~i,a=~~s,h=i-o,l=s-a,f=e.bitmap.subarray(4*(r+n*e.width),-4),u={r:0,g:0,b:0,a:0};_.__pawn__(o,a,(1-h)*(1-l),u,t),_.__pawn__(1+o,a,h*(1-l),u,t),_.__pawn__(o,1+a,(1-h)*l,u,t),_.__pawn__(1+o,1+a,h*l,u,t),f[3]=u.a,f[0]=u.r/u.a,f[1]=u.g/u.a,f[2]=u.b/u.a}static __pawn__(t,e,r,n,i){if(t>0&&e>0&&t<i.width&&e<i.height){const s=4*(t+e*i.width),o=i.bitmap.subarray(s,s+4),a=r*o[3];n.a+=a,n.r+=a*o[0],n.g+=a*o[1],n.b+=a*o[2]}}__apply__(t){return this.__width__=t.__width__,this.__height__=t.__height__,this.__view__=t.__view__,this.__u32__=t.__u32__,this.bitmap=t.bitmap,this}static gradient(t){const e=Object.entries(t).sort(((t,e)=>t[0]-e[0])),r=e.map((t=>parseFloat(t[0]))),n=e.map((t=>t[1]));if(0===r.length)throw new RangeError("Invalid gradient point count");if(1===r.length)return()=>n[0];if(2===r.length){const t=this.__gradient__(n[0],n[1]);return e=>e<=r[0]?n[0]:e>=r[1]?n[1]:t((e-r[0])/(r[1]-r[0]))}const i=Math.min(...r),s=Math.max(...r);let o=[];for(let t=0;t<r.length;t++){let e=r[t-1];if(void 0===e)continue;let i=r[t],s=n[t-1];void 0===s&&(s=n[t]);const a=n[t],h=this.__gradient__(s,a);o.push({min:e,max:i,gradient:h})}return t=>{if(t<=i)return o[0].gradient(0);if(t>=s)return o[o.length-1].gradient(1);for(const e of o)if(t>=e.min&&t<=e.max)return e.gradient((t-e.min)/(e.max-e.min));throw new RangeError(`Invalid gradient position: ${t}`)}}roundCorners(t=Math.min(this.width,this.height)/4){const e=t**2;for(let r=1;r<=t;r++){const n=(r-t)**2;for(let i=1;i<=t;i++)n+(i-t)**2>e&&(this.bitmap[4*((i-1)*this.width+r-1)+3]=0)}for(let r=1;r<=t;r++){const n=(r-t)**2;for(let i=this.height-t;i<=this.height;i++)n+(this.height-i-t)**2>e&&(this.bitmap[4*((i-1)*this.width+r-1)+3]=0)}for(let r=this.width-t;r<=this.width;r++){const n=(this.width-r-t)**2;for(let i=1;i<=t;i++)n+(i-t)**2>e&&(this.bitmap[4*((i-1)*this.width+r-1)+3]=0)}for(let r=this.width-t;r<=this.width;r++){const n=(this.width-r-t)**2;for(let i=this.height-t;i<=this.height;i++)n+(this.height-i-t)**2>e&&(this.bitmap[4*((i-1)*this.width+r-1)+3]=0)}return this}static __gradient__(t,e){const r=t>>>24,n=t>>16&255,i=t>>8&255,s=255&t,o=(e>>>24)-r,a=(e>>16&255)-n,h=(e>>8&255)-i,_=(255&e)-s;return t=>(255&r+t*o)<<24|(255&n+t*a)<<16|(255&i+t*h)<<8|255&s+t*_}async encode(t=1){return await n.encode(this.bitmap,{width:this.width,height:this.height,level:t,channels:4})}async encodeJPEG(t=90){t=Math.max(1,Math.min(100,t));const e=new this.constructor(this.width,this.height);return e.fill(255),e.composite(this),o.encode(this.width,this.height,t,e.bitmap)}static async decode(t){let e,r;if(ArrayBuffer.isView(t)?(t=new Uint8Array(t.buffer,t.byteOffset,t.byteLength),r=new DataView(t.buffer,t.byteOffset,t.byteLength)):(t=new Uint8Array(t),r=new DataView(t.buffer)),2303741511===r.getUint32(0,!1)){const{width:r,height:i,pixels:s}=await n.decode(t);e=new this(r,i),e.bitmap.set(s)}else if(r.getUint32(0,!1)>>>8==16767231){if(1===await o.decode(0,t,0,0))throw new Error("Failed decoding JPEG image");const[r,n,i]=o.meta(0);e=new this(n,i);const s=o.buffer(0);if(o.free(0),0===r){const t=new DataView(e.bitmap.buffer);for(let e=0;e<s.length;e++){const r=s[e];t.setUint32(4*e,r<<24|r<<16|r<<8|255,!1)}}else if(1===r){e.bitmap.fill(255);for(let t=0;t<n*i;t++)e.bitmap.set(s.subarray(3*t,3*t+3),4*t)}else if(2===r)for(let t=0;t<s.length;t+=4)e.bitmap[t]=255*(1-s[t]/255)*(1-s[t+3]/255),e.bitmap[t+1]=255*(1-s[t+1]/255)*(1-s[t+3]/255),e.bitmap[t+2]=255*(1-s[t+2]/255)*(1-s[t+3]/255),e.bitmap[t+3]=255}else{if(1229531648!==r.getUint32(0,!1))throw new Error("Unsupported image type");{if(1===await a.decode(0,t))throw new Error("Failed decoding TIFF image");const r=a.meta(0),n=a.buffer(0);a.free(0),e=new this(...r),e.bitmap.set(n)}}return e}static get SVG_MODE_SCALE(){return 1}static get SVG_MODE_WIDTH(){return 2}static get SVG_MODE_HEIGHT(){return 3}static async renderSVG(t,e=1,r=this.SVG_MODE_SCALE){if(![this.SVG_MODE_WIDTH,this.SVG_MODE_HEIGHT,this.SVG_MODE_SCALE].includes(r))throw new Error("Invalid SVG scaling mode");if(r===this.SVG_MODE_SCALE&&e<=0)throw new RangeError("SVG scale must be > 0");if(r!==this.SVG_MODE_SCALE&&e<1)throw new RangeError("SVG size must be >= 1");"string"!=typeof t&&(t=t.toString());const n=await s.rgba(0,t,r,e,e,e);if(1===n)throw new Error("Failed parsing SVG");if(2===n)throw new Error("Failed rendering SVG");const i=new this(...s.meta(0));return i.bitmap.set(s.buffer(0)),s.free(0),i}static get WRAP_STYLE_CHAR(){return!0}static get WRAP_STYLE_WORD(){return!1}static async renderText(t,e,r,n=4294967295,s=1/0,o=this.WRAP_STYLE_WORD){const[a,h,l,f]=_.colorToRGBA(n);await i.load(0,t,e),i.render(0,0,e,a,h,l,r,s===1/0?null:s,o);const u=i.buffer(0),[c,w]=i.meta(0);i.free(0);const g=new this(c,w);return g.bitmap.set(u),g.opacity(f/255),g}}class l extends _{constructor(t,e,r=100){if(isNaN(r)||r<0)throw new RangeError("Invalid frame duration");super(t,e),this.duration=r}toString(){return`Frame<${this.width}x${this.height}x${this.duration}ms>`}static from(t,e){if(!(t instanceof _))throw new TypeError("Invalid image passed");const r=new l(t.width,t.height,e);return r.bitmap.set(t.bitmap),r}}t.exports={Image:_,GIF:class extends Array{constructor(t,e=-1){super(...t),this.width=t[0].width,this.height=t[0].height;for(const t of this){if(!(t instanceof l))throw new TypeError(`Frame ${this.indexOf(t)} is not an instance of Frame`);if(t.width!==this.width)throw new Error("Frames have different widths");if(t.height!==this.height)throw new Error("Frames have different heights")}if(e<-1||isNaN(e))throw new RangeError("Invalid loop count");this.loopCount=e}toString(){return`GIF<${this.width}x${this.height}x${this.duration}ms>`}get duration(){return[...this].reduce(((t,e)=>t+e.duration),0)}async encode(t=10){const e=await h.GIFEncoder.initialize(this.width,this.height,this.loopCount);for(const r of this){if(!(r instanceof l))throw new Error("GIF contains invalid frames");e.add(~~(r.duration/10),t,r.bitmap)}const r=e.buffer();return e.free(),r}},Frame:l}},306:t=>{"use strict";t.exports=JSON.parse('{"name":"imagescript","version":"1.1.14","description":"zero-dependency javascript image manipulation","main":"ImageScript.js","type":"commonjs","scripts":{"build":"webpack"},"repository":{"type":"git","url":"git+https://github.com/matmen/ImageScript.git"},"keywords":["image","image processing","image manipulation"],"author":"matmen <matmen@dreadful.tech>","license":"GPL-3.0-or-later","bugs":{"url":"https://github.com/matmen/ImageScript/issues"},"homepage":"https://github.com/matmen/ImageScript#readme","engines":{"node":">=12.0.0"}}')},354:t=>{t.exports=class{static concat(...t){const e=new Uint8Array(t.reduce(((t,e)=>t+e.length),0));let r=0;for(const n of t)e.set(n,r),r+=n.length;return e}}},883:t=>{const e=new Uint32Array([0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918e3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117]);t.exports=function(t){let r=0,n=4294967295;for(;r<t.length-4;)n=e[255&(n^t[r++])]^n>>>8,n=e[255&(n^t[r++])]^n>>>8,n=e[255&(n^t[r++])]^n>>>8,n=e[255&(n^t[r++])]^n>>>8;for(;r<t.length;)n=e[255&(n^t[r++])]^n>>>8;return(4294967295^n)>>>0}},347:(t,e,r)=>{const n=r(883),i=r(354),{compress:s,decompress:o}=r(423),a=new Uint8Array([73,72,68,82]),h=new Uint8Array([73,68,65,84]),_=new Uint8Array([73,69,78,68]),l=n(new Uint8Array([73,69,78,68])),f=new Uint8Array([137,80,78,71,13,10,26,10]),u={1:0,2:4,3:2,4:6};t.exports={async encode(t,{width:e,height:r,channels:i,depth:o=8,level:c=0}){let w=0,g=0;const b=e*i,d=new Uint8Array(r+t.length);for(;w<t.length;)d[g++]=0,d.set(t.subarray(w,w+=b),g),g+=b;const m=await s(d,c),p=new Uint8Array(49+f.length+m.length);p[26]=0,p[27]=0,p[28]=0,p[24]=o,p.set(f,0),p.set(a,12),p.set(h,37),p.set(m,41),p.set(_,49+m.length),p[25]=u[i];const y=new DataView(p.buffer);return y.setUint32(8,13),y.setUint32(16,e),y.setUint32(20,r),y.setUint32(33,m.length),y.setUint32(45+m.length,0),y.setUint32(53+m.length,l),y.setUint32(29,n(new Uint8Array(p.buffer,12,17))),y.setUint32(41+m.length,n(new Uint8Array(p.buffer,37,4+m.length))),p},async decode(t){let e=new DataView(t.buffer,t.byteOffset,t.byteLength);const r=e.getUint32(16),n=e.getUint32(20),s=t[24];let a={3:1,0:1,4:2,2:3,6:4}[t[25]];const h=a*s/8,_=r*h;let l=new Uint8Array(n*_),f=0,u=0,c=33;const w=[];let g,b;for(3===t[25]&&(g=new Uint32Array(2**s));1229278788!==b;){if(b=e.getUint32(4+c),1229209940===b)w.push(t.subarray(8+c,8+c+e.getUint32(c)));else if(1347179589===b)for(let e=0;e<8*g.length;e+=3)g[e/3]=t[8+c+e]<<24|t[8+c+e+1]<<16|t[8+c+e+2]<<8|255;c+=12+e.getUint32(c)}for(t=await o(1===w.length?w[0]:i.concat(...w));f<t.byteLength;){const e=t[f++],r=t.subarray(f,f+=_);0===e?l.set(r,u):1===e?this.filter_1(r,l,u,h,_):2===e?this.filter_2(r,l,u,h,_):3===e?this.filter_3(r,l,u,h,_):4===e&&this.filter_4(r,l,u,h,_),u+=_}if(1===a&&g){a=4;const t=new Uint8Array(r*n*4),e=new DataView(t.buffer,t.byteOffset,t.byteLength);for(let t=0;t<l.length;t++)e.setUint32(4*t,g[l[t]],!1);l=t}if(8!==s){const t=new Uint8Array(l.length/s*8);for(let e=0;e<l.length;e+=2)t[e/2]=l[e];l=t}if(4!==a){const t=new Uint8Array(r*n*4),e=new DataView(t.buffer);if(1===a)for(let t=0;t<r*n;t++){const r=l[t];e.setUint32(4*t,r<<24|r<<16|r<<8|255,!1)}else if(2===a)for(let t=0;t<r*n*2;t+=2){const r=l[t];e.setUint32(2*t,r<<24|r<<16|r<<8|l[t+1],!1)}else if(3===a){t.fill(255);for(let e=0;e<r*n;e++)t.set(l.subarray(3*e,3*e+3),4*e)}l=t}return{width:r,height:n,pixels:l}},filter_1(t,e,r,n,i){let s=0;for(;s<n;)e[s+r]=t[s++];for(;s<i;)e[s+r]=t[s]+e[s+++r-n]},filter_2(t,e,r,n,i){if(0===r)e.set(t,r);else{let n=0;for(;n<i;)e[n+r]=t[n]+e[n+++r-i]}},filter_3(t,e,r,n,i){let s=0;if(0===r){for(;s<n;)e[s]=t[s++];for(;s<i;)e[s]=t[s]+(e[s++-n]>>1)}else{for(;s<n;)e[s+r]=t[s]+(e[s+++r-i]>>1);for(;s<i;)e[s+r]=t[s]+(e[s+r-n]+e[s+++r-i]>>1)}},filter_4(t,e,r,n,i){let s=0;if(0===r){for(;s<n;)e[s]=t[s++];for(;s<i;)e[s]=t[s]+e[s++-n]}else{for(;s<n;)e[s+r]=t[s]+e[s+++r-i];for(;s<i;){const o=e[s+r-n],a=e[s+r-i],h=e[s+r-n-i],_=o+a-h,l=Math.abs(_-o),f=Math.abs(_-a),u=Math.abs(_-h);e[s+r]=t[s++]+(l<=f&&l<=u?o:f<=u?a:h)}}}}},723:(t,e,r)=>{const{version:n}=r(306);let i,s,o,a;const h=new TextEncoder;function _(){return i.buffer===a.memory.buffer?i:i=new Uint8Array(a.memory.buffer)}function l(){return s.buffer===a.memory.buffer?s:s=new Int32Array(a.memory.buffer)}t.exports={render(t,e,r,n,i,s,o,l,f=!1){const u=function(t){let e=0,r=t.length,n=a.__wbindgen_malloc(t.length);const i=_();for(;r>e;){const r=t.charCodeAt(e);if(r>127)break;i[n+e++]=r}return e!==r&&(0!==e&&(t=t.substring(e)),n=a.__wbindgen_realloc(n,r,r=e+3*t.length),e+=h.encodeInto(t,_().subarray(n+e,n+r)).written),[n,e]}(o);a.render(t,e,r,n,i,s,u[0],u[1],!(null==l),l||0,f)},buffer(t){a.buffer(8,t);const e=l(),r=(n=e[2],i=e[3],_().subarray(n,n+i)).slice();var n,i;return a.__wbindgen_free(e[2],e[3]),r},meta(t){a.meta(8,t);const e=l(),r=(n=e[2],i=e[3],(o.buffer===a.memory.buffer?o:o=new Uint32Array(a.memory.buffer)).subarray(n/4,n/4+i)).slice();var n,i;return a.__wbindgen_free(e[2],4*e[3]),r},async load(t,e,r=128){if(!a){const t=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/font.wasm`).then((t=>t.arrayBuffer()))),e=new WebAssembly.Instance(t);a=e.exports,i=new Uint8Array(a.memory.buffer),s=new Int32Array(a.memory.buffer),o=new Uint32Array(a.memory.buffer)}a.load(t,function(t){const e=a.__wbindgen_malloc(t.length);return _().set(t,e),e}(e),e.length,r)},free(t){a.free(t)}}},667:(t,e,r)=>{const{version:n}=r(306);let i,s=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});s.decode();let o=null;function a(){return null!==o&&o.buffer===i.memory.buffer||(o=new Uint8Array(i.memory.buffer)),o}let h=null;function _(){return null!==h&&h.buffer===i.memory.buffer||(h=new Int32Array(i.memory.buffer)),h}let l=0;class f{free(){i.__wbg_gif_encoder_free(this.ptr)}static async initialize(t,e,r){if(!i){const t=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/gif.wasm`).then((t=>t.arrayBuffer()))),e=new WebAssembly.Instance(t,{__wbindgen_placeholder__:{__wbindgen_throw:function(t,e){throw new Error((r=t,n=e,s.decode(a().subarray(r,r+n))));var r,n}}});i=e.exports}const o=i.gif_encoder_new(t,e,r);return new f(o)}constructor(t){this.ptr=t}buffer(){try{const r=i.__wbindgen_export_0.value-16;i.__wbindgen_export_0.value=r,i.gif_encoder_buffer(r,this.ptr);const n=_()[r/4],s=_()[r/4+1],o=(t=n,e=s,a().subarray(t/1,t/1+e)).slice();return i.__wbindgen_free(n,1*s),o}finally{i.__wbindgen_export_0.value+=16}var t,e}add(t,e,r){const n=function(t,e){const r=e(1*t.length);return a().set(t,r/1),l=t.length,r}(r,i.__wbindgen_malloc);i.gif_encoder_add(this.ptr,t,e,n,l)}}t.exports={GIFEncoder:f}},327:(t,e,r)=>{const{version:n}=r(306);let i,s=null;function o(){return null!==s&&s.buffer===i.memory.buffer||(s=new Uint8Array(i.memory.buffer)),s}let a=0;function h(t,e){const r=e(1*t.length);return o().set(t,r/1),a=t.length,r}let _=null;function l(){return null!==_&&_.buffer===i.memory.buffer||(_=new Int32Array(i.memory.buffer)),_}function f(t,e){return o().subarray(t/1,t/1+e)}let u=null;async function c(){if(i)return;const t=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/jpeg.wasm`).then((t=>t.arrayBuffer()))),e=new WebAssembly.Instance(t);i=e.exports}t.exports={async encode(t,e,r,n){await c();try{const s=i.__wbindgen_export_0.value-16;i.__wbindgen_export_0.value=s;const o=h(n,i.__wbindgen_malloc);i.encode(s,t,e,r,o,a);const _=l()[s/4],u=l()[s/4+1],c=f(_,u).slice();return i.__wbindgen_free(_,1*u),c}finally{i.__wbindgen_export_0.value+=16}},async decode(t,e,r,n){await c();const s=h(e,i.__wbindgen_malloc);return i.decode(t,s,a,r,n)},meta(t){try{const n=i.__wbindgen_export_0.value-16;i.__wbindgen_export_0.value=n,i.meta(n,t);const s=l()[n/4],o=l()[n/4+1],a=(e=s,r=o,(null!==u&&u.buffer===i.memory.buffer||(u=new Uint16Array(i.memory.buffer)),u).subarray(e/2,e/2+r)).slice();return i.__wbindgen_free(s,2*o),a}finally{i.__wbindgen_export_0.value+=16}var e,r},buffer(t){try{const e=i.__wbindgen_export_0.value-16;i.__wbindgen_export_0.value=e,i.buffer(e,t);const r=l()[e/4],n=l()[e/4+1],s=f(r,n).slice();return i.__wbindgen_free(r,1*n),s}finally{i.__wbindgen_export_0.value+=16}},free(t){i.free(t)}}},876:(t,e,r)=>{const{version:n}=r(306);let i,s=0,o=null;function a(){return null!==o&&o.buffer===i.memory.buffer||(o=new Uint8Array(i.memory.buffer)),o}let h=new TextEncoder;const _="function"==typeof h.encodeInto?function(t,e){return h.encodeInto(t,e)}:function(t,e){const r=h.encode(t);return e.set(r),{read:t.length,written:r.length}};let l=null;function f(){return null!==l&&l.buffer===i.memory.buffer||(l=new Int32Array(i.memory.buffer)),l}let u=null;t.exports={async rgba(t,e,r,o,h,l){if(!i){const t=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/svg.wasm`).then((t=>t.arrayBuffer()))),e=new WebAssembly.Instance(t);i=e.exports}const f=function(t,e,r){if(void 0===r){const r=(new TextEncoder).encode(t),n=e(r.length);return a().subarray(n,n+r.length).set(r),s=r.length,n}let n=t.length,i=e(n);const o=a();let h=0;for(;h<n;h++){const e=t.charCodeAt(h);if(e>127)break;o[i+h]=e}if(h!==n){0!==h&&(t=t.slice(h)),i=r(i,n,n=h+3*t.length);const e=a().subarray(i+h,i+n);h+=_(t,e).written}return s=h,i}(e,i.__wbindgen_malloc,i.__wbindgen_realloc);return i.rgba(t,f,s,r,o,h,l)},meta(t){try{const n=i.__wbindgen_export_2.value-16;i.__wbindgen_export_2.value=n,i.meta(n,t);const s=f()[n/4],o=f()[n/4+1],a=(e=s,r=o,(null!==u&&u.buffer===i.memory.buffer||(u=new Uint32Array(i.memory.buffer)),u).subarray(e/4,e/4+r)).slice();return i.__wbindgen_free(s,4*o),a}finally{i.__wbindgen_export_2.value+=16}var e,r},buffer(t){try{const n=i.__wbindgen_export_2.value-16;i.__wbindgen_export_2.value=n,i.buffer(n,t);const s=f()[n/4],o=f()[n/4+1],h=(e=s,r=o,a().subarray(e,e+r)).slice();return i.__wbindgen_free(s,o),h}finally{i.__wbindgen_export_2.value+=16}var e,r},free(t){i.free(t)}}},76:(t,e,r)=>{const{version:n}=r(306);let i,s=null;function o(){return null!==s&&s.buffer===i.memory.buffer||(s=new Uint8Array(i.memory.buffer)),s}let a=0,h=null;function _(){return null!==h&&h.buffer===i.memory.buffer||(h=new Int32Array(i.memory.buffer)),h}let l=null;t.exports={async decode(t,e){if(!i){const t=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/tiff.wasm`).then((t=>t.arrayBuffer()))),e=new WebAssembly.Instance(t);i=e.exports}const r=function(t,e){const r=e(1*t.length);return o().set(t,r/1),a=t.length,r}(e,i.__wbindgen_malloc);return i.decode(t,r,a)},meta(t){try{const n=i.__wbindgen_export_1.value-16;i.__wbindgen_export_1.value=n,i.meta(n,t);const s=_()[n/4],o=_()[n/4+1],a=(e=s,r=o,(null!==l&&l.buffer===i.memory.buffer||(l=new Uint32Array(i.memory.buffer)),l).subarray(e/4,e/4+r)).slice();return i.__wbindgen_free(s,4*o),a}finally{i.__wbindgen_export_1.value+=16}var e,r},buffer(t){try{const n=i.__wbindgen_export_1.value-16;i.__wbindgen_export_1.value=n,i.buffer(n,t);const s=_()[n/4],a=_()[n/4+1],h=(e=s,r=a,o().subarray(e/1,e/1+r)).slice();return i.__wbindgen_free(s,1*a),h}finally{i.__wbindgen_export_1.value+=16}var e,r},free(t){i.free(t)}}},423:(t,e,r)=>{const{version:n}=r(306);async function i(){let t;{const e=new WebAssembly.Module(await fetch(`https://unpkg.com/imagescript@${n}/utils/wasm/zlib.wasm`).then((t=>t.arrayBuffer()))),r=new WebAssembly.Instance(e);t=r.exports}let e=new Uint8Array(t.memory.buffer),r=new Int32Array(t.memory.buffer);function i(){return e.buffer===t.memory.buffer?e:e=new Uint8Array(t.memory.buffer)}function s(){return r.buffer===t.memory.buffer?r:r=new Int32Array(t.memory.buffer)}function o(t,e){return i().subarray(t,t+e)}function a(e){const r=t.__wbindgen_malloc(e.length);return i().set(e,r),r}return{compress(e,r){const n=a(e);t.compress(8,n,e.length,r);const i=s(),h=o(i[2],i[3]).slice();return t.__wbindgen_free(i[2],i[3]),h},decompress(e,r){const n=a(e);try{t.decompress(8,n,e.length,r);const i=s(),a=o(i[2],i[3]).slice();return t.__wbindgen_free(i[2],i[3]),a}catch{throw t.__wbindgen_free(n,e.length),new Error("zlib: panic")}}}}t.exports={async compress(e,r){const{compress:n}=t.exports=await i();return n(e,r)},async decompress(e,r){const{decompress:n}=t.exports=await i();return n(e,r)}}}},e={};return function r(n){if(e[n])return e[n].exports;var i=e[n]={exports:{}};return t[n](i,i.exports,r),i.exports}(655)})();
//# sourceMappingURL=ImageScript.js.map