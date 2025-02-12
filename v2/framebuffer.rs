#![allow(dead_code)]
#![warn(clippy::perf)]
#![feature(decl_macro)]
#![feature(unchecked_math)]
#![warn(clippy::complexity)]
#![feature(core_intrinsics)]
#![warn(clippy::correctness)]
#![allow(non_camel_case_types)]
#![allow(non_upper_case_globals)]
#![feature(destructuring_assignment)]
#![feature(const_fn_floating_point_arithmetic)]

#[inline(always)] const unsafe fn unreachable() -> ! { std::hint::unreachable_unchecked(); }
#[inline] fn alloc(size: usize) -> *mut u8 { unsafe { return std::alloc::alloc(alloc_align(size)); } }
#[inline] fn free(ptr: *mut u8, size: usize) { unsafe { std::alloc::dealloc(ptr, alloc_align(size)); } }
#[inline] fn calloc(size: usize) -> *mut u8 { unsafe { return std::alloc::alloc_zeroed(alloc_align(size)); } }
#[inline] const fn alloc_align(size: usize) -> std::alloc::Layout { return unsafe { std::alloc::Layout::from_size_align_unchecked(size, 16) }; }

type fb = framebuffer;

pub struct framebuffer {
  pub width: usize,
  pub height: usize,
  ptr: (bool, *mut u8),
}

unsafe impl Send for framebuffer {}
unsafe impl Sync for framebuffer {}

impl Drop for framebuffer {
  fn drop(&mut self) { if self.ptr.0 { free(self.ptr_mut(), self.len()); } }
}

impl Clone for framebuffer {
  fn clone(&self) -> Self {
    let ptr = alloc(self.len());
    unsafe { self.ptr.1.copy_to_nonoverlapping(ptr, self.len()); }
    return Self { width: self.width, height: self.height, ptr: (true, ptr) };
  }
}

impl framebuffer {
  pub fn new(width: usize, height: usize) -> Self { return Self { width, height, ptr: (true, calloc(4 * width * height)) }; }
  pub const unsafe fn from_ptr(width: usize, height: usize, ptr: *mut u8) -> Self { return Self { width, height, ptr: (false, ptr) }; }
  pub unsafe fn new_fast(width: usize, height: usize) -> Self { return Self { width, height, ptr: (true, alloc(4 * width * height)) }; }
  pub const unsafe fn from(width: usize, height: usize, buffer: &[u8]) -> Self { return Self { width, height, ptr: (false, buffer.as_ptr() as _) }; }
  pub unsafe fn from_mut(width: usize, height: usize, buffer: &mut [u8]) -> Self { return Self { width, height, ptr: (false, buffer.as_mut_ptr()) }; }

  pub fn ptr_mut<T>(&mut self) -> *mut T { return self.ptr.1 as *mut T; }
  pub const fn ptr<T>(&self) -> *const T { return self.ptr.1 as *const T; }
  pub const fn len(&self) -> usize { return 4 * self.width * self.height; }
  pub fn slice<T>(&self) -> &[T] { return unsafe { std::slice::from_raw_parts(self.ptr(), self.len() / std::mem::size_of::<T>()) }; }
  pub fn set(&mut self, x: usize, y: usize, color: colors::rgba) { unsafe { *self.ptr_mut::<u32>().add(x + y * self.width) = color.into() }; }
  pub fn get(&self, x: usize, y: usize) -> colors::rgba { return unsafe { std::mem::transmute(*self.ptr::<u32>().add(x + y * self.width)) }; }
  pub fn slice_mut<T>(&mut self) -> &mut [T] { return unsafe { std::slice::from_raw_parts_mut(self.ptr_mut(), self.len() / std::mem::size_of::<T>()) }; }
  pub fn vec<T>(mut self) -> Vec<T> { self.ptr.0 = false; return unsafe { Vec::from_raw_parts(self.ptr.1 as *mut T, self.len() / std::mem::size_of::<T>(), alloc_align(self.len()).size() / std::mem::size_of::<T>()) }; }
}

pub mod colors {
  #[repr(C)] #[derive(Copy, Clone)] pub struct rgb { pub r: u8, pub g: u8, pub b: u8 }
  #[repr(C)] #[derive(Copy, Clone)] pub struct rgba { pub r: u8, pub g: u8, pub b: u8, pub a: u8 }

  impl From<rgba> for rgb {
    #[inline] fn from(c: rgba) -> rgb { return rgb { r: c.r, g: c.g, b: c.b }; }
  }

  impl From<rgb> for rgba {
    #[inline] fn from(c: rgb) -> rgba { return rgba { r: c.r, g: c.g, b: c.b, a: 255 }; }
  }

  impl From<rgb> for u32 {
    #[inline] fn from(c: rgb) -> u32 { return c.r as u32 | ((c.g as u32) << 8) | ((c.b as u32) << 16) | (255 << 24); }
  }

  impl From<rgba> for u32 {
    #[inline] fn from(c: rgba) -> u32 { return c.r as u32 | ((c.g as u32) << 8) | ((c.b as u32) << 16) | ((c.a as u32) << 24); }
  }

  impl From<u32> for rgb {
    #[inline] fn from(c: u32) -> rgb { return rgb { r: (c & 0xFF) as u8, g: ((c >> 8) & 0xFF) as u8, b: ((c >> 16) & 0xFF) as u8 }; }
  }

  impl From<u32> for rgba {
    #[inline] fn from(c: u32) -> rgba { return rgba { r: (c & 0xFF) as u8, g: ((c >> 8) & 0xFF) as u8, b: ((c >> 16) & 0xFF) as u8, a: (c >> 24) as u8 }; }
  }

  pub fn blend(bg: u32, fg: u32) -> u32 {
    let fa = fg >> 24;
    let alpha = 1 + fa;
    let inv_alpha = 256 - fa;
    let r = (alpha * (fg & 0xff) + inv_alpha * (bg & 0xff)) >> 8;
    let g = (alpha * ((fg >> 8) & 0xff) + inv_alpha * ((bg >> 8) & 0xff)) >> 8;
    let b = (alpha * ((fg >> 16) & 0xff) + inv_alpha * ((bg >> 16) & 0xff)) >> 8;
    return r | ((g & 0xff) << 8) | ((b & 0xff) << 16) | (fa.max(bg >> 24) << 24);
  }
}

pub mod ops {
  use super::*;

  pub mod filter {
    use super::*;

    pub fn opacity(fb: &mut fb, mut amount: f32) {
      amount = amount.clamp(0.0, 1.0);
      let u8 = unsafe { fb.ptr_mut::<u8>().offset(3) };

      let mut offset = 0;
      let len = fb.len();
      while len > offset {
        use std::intrinsics::{fmul_fast as fm, float_to_int_unchecked as fi};
        unsafe { *u8.add(offset) = fi::<f32, u8>(fm(amount, *u8.add(offset) as f32)); }

        offset += 4;
      }
    }

    pub fn brightness(fb: &mut fb, amount: f32) {
      let u32 = fb.ptr_mut::<u32>();

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let r = fi::<f32, u32>(fm(amount, (c & 0xff) as f32)).min(255);
          let g = fi::<f32, u32>(fm(amount, ((c >> 8) & 0xff) as f32)).min(255);
          let b = fi::<f32, u32>(fm(amount, ((c >> 16) & 0xff) as f32)).min(255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn contrast(fb: &mut fb, amount: f32) {
      let u32 = fb.ptr_mut::<u32>();
      let i = 255.0 * (0.5 - (0.5 * amount));

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fadd_fast as fa, fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let r = fi::<f32, u32>(fa(i, fm(amount, (c & 0xff) as f32))).min(255);
          let g = fi::<f32, u32>(fa(i, fm(amount, ((c >> 8) & 0xff) as f32))).min(255);
          let b = fi::<f32, u32>(fa(i, fm(amount, ((c >> 16) & 0xff) as f32))).min(255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn saturate(fb: &mut fb, amount: f32) {
      let u32 = fb.ptr_mut::<u32>();

      let filter: [f32; 9] = [
        0.213 + 0.787 * amount, 0.715 - 0.715 * amount, 0.072 - 0.072 * amount,
        0.213 - 0.213 * amount, 0.715 + 0.285 * amount, 0.072 - 0.072 * amount,
        0.213 - 0.213 * amount, 0.715 - 0.715 * amount, 0.072 + 0.928 * amount,
      ];

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fadd_fast as fa, fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let rr = (c & 0xff) as f32;
          let gg = ((c >> 8) & 0xff) as f32;
          let bb = ((c >> 16) & 0xff) as f32;
          let r = fi::<f32, u32>(fa(fm(rr, filter[0]), fa(fm(gg, filter[1]), fm(bb, filter[2])))).clamp(0, 255);
          let g = fi::<f32, u32>(fa(fm(rr, filter[3]), fa(fm(gg, filter[4]), fm(bb, filter[5])))).clamp(0, 255);
          let b = fi::<f32, u32>(fa(fm(rr, filter[6]), fa(fm(gg, filter[7]), fm(bb, filter[8])))).clamp(0, 255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn sepia(fb: &mut fb, mut amount: f32) {
      let u32 = fb.ptr_mut::<u32>();
      amount = (1.0 - amount).clamp(0.0, 1.0);

      let filter: [f32; 9] = [
        0.393 + 0.607 * amount, 0.769 - 0.769 * amount, 0.189 - 0.189 * amount,
        0.349 - 0.349 * amount, 0.686 + 0.314 * amount, 0.168 - 0.168 * amount,
        0.272 - 0.272 * amount, 0.534 - 0.534 * amount, 0.131 + 0.869 * amount,
      ];

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fadd_fast as fa, fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let rr = (c & 0xff) as f32;
          let gg = ((c >> 8) & 0xff) as f32;
          let bb = ((c >> 16) & 0xff) as f32;
          let r = fi::<f32, u32>(fa(fm(rr, filter[0]), fa(fm(gg, filter[1]), fm(bb, filter[2])))).clamp(0, 255);
          let g = fi::<f32, u32>(fa(fm(rr, filter[3]), fa(fm(gg, filter[4]), fm(bb, filter[5])))).clamp(0, 255);
          let b = fi::<f32, u32>(fa(fm(rr, filter[6]), fa(fm(gg, filter[7]), fm(bb, filter[8])))).clamp(0, 255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn grayscale(fb: &mut fb, mut amount: f32) {
      let u32 = fb.ptr_mut::<u32>();
      amount = (1.0 - amount).clamp(0.0, 1.0);

      let filter: [f32; 9] = [
        0.2126 + 0.7874 * amount, 0.7152 - 0.7152 * amount, 0.0722 - 0.0722 * amount,
        0.2126 - 0.2126 * amount, 0.7152 + 0.2848 * amount, 0.0722 - 0.0722 * amount,
        0.2126 - 0.2126 * amount, 0.7152 - 0.7152 * amount, 0.0722 + 0.9278 * amount,
      ];

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fadd_fast as fa, fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let rr = (c & 0xff) as f32;
          let gg = ((c >> 8) & 0xff) as f32;
          let bb = ((c >> 16) & 0xff) as f32;
          let r = fi::<f32, u32>(fa(fm(rr, filter[0]), fa(fm(gg, filter[1]), fm(bb, filter[2])))).clamp(0, 255);
          let g = fi::<f32, u32>(fa(fm(rr, filter[3]), fa(fm(gg, filter[4]), fm(bb, filter[5])))).clamp(0, 255);
          let b = fi::<f32, u32>(fa(fm(rr, filter[6]), fa(fm(gg, filter[7]), fm(bb, filter[8])))).clamp(0, 255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn hue_rotate(fb: &mut fb, deg: f32) {
      let u32 = fb.ptr_mut::<u32>();
      let cos = f32::cos(deg.to_radians());
      let sin = f32::sin(deg.to_radians());

      let filter: [f32; 9] = [
        0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
        0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
        0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
      ];

      for o in 0..(fb.len() / 4) {
        unsafe {
          use std::intrinsics::{fadd_fast as fa, fmul_fast as fm, float_to_int_unchecked as fi};

          let c = *u32.add(o);
          let rr = (c & 0xff) as f32;
          let gg = ((c >> 8) & 0xff) as f32;
          let bb = ((c >> 16) & 0xff) as f32;
          let r = fi::<f32, u32>(fa(fm(rr, filter[0]), fa(fm(gg, filter[1]), fm(bb, filter[2])))).clamp(0, 255);
          let g = fi::<f32, u32>(fa(fm(rr, filter[3]), fa(fm(gg, filter[4]), fm(bb, filter[5])))).clamp(0, 255);
          let b = fi::<f32, u32>(fa(fm(rr, filter[6]), fa(fm(gg, filter[7]), fm(bb, filter[8])))).clamp(0, 255);

          *u32.add(o) = r | (g << 8) | (b << 16) | (c >> 24 << 24);
        }
      }
    }

    pub fn drop_shadow(fb: &mut fb, x: isize, y: isize, sigma: f32, color: Option<colors::rgba>) {
      let mut old = fb.clone();
      let u32 = old.ptr_mut::<u32>();
      ops::blur::gaussian(&mut old, sigma);

      if color.is_some() {
        unsafe {
          let cc: u32 = color.unwrap_unchecked().into();

          let ca = cc >> 24;
          let cc = cc & 0xffffff;

          for o in 0..(fb.len() / 4) {
            let c = *u32.add(o);
            if 0 != (c >> 24) { *u32.add(o) = cc | (c >> 24 << 24) }
          }

          if ca != 255 { ops::filter::opacity(&mut old, 1.0 / 255.0 * ca as f32); }
        }
      }

      ops::overlay::background(fb, &old, x, y);
    }

    pub fn invert(fb: &mut fb, mut amount: f32) {
      let u32 = fb.ptr_mut::<u32>();
      amount = amount.clamp(0.0, 1.0);

      if 1.0 == amount {
        for o in 0..(fb.len() / 4) {
          unsafe {
            let c = *u32.add(o);
            *u32.add(o) = !c & 0xffffff | (c >> 24 << 24);
          }
        }
      }

      else {
        let inv = 1.0 - amount;

        for o in 0..(fb.len() / 4) {
          use std::intrinsics::{fadd_fast as fa, fsub_fast as fs, fmul_fast as fm, float_to_int_unchecked as fi};

          unsafe {
            let c = *u32.add(o);
            let r = (c & 0xff) as f32;
            let g = ((c >> 8) & 0xff) as f32;
            let b = ((c >> 16) & 0xff) as f32;
            let r = fi::<f32, u32>(fa(fm(r, amount), fm(inv, fs(255.0, r))));
            let g = fi::<f32, u32>(fa(fm(g, amount), fm(inv, fs(255.0, g))));
            let b = fi::<f32, u32>(fa(fm(b, amount), fm(inv, fs(255.0, b))));
            *u32.add(o) = r | ((g & 0xff) << 8) | ((b & 0xff) << 16) | (c >> 24 << 24);
          }
        }
      }
    }
  }

  pub mod crop {
    use super::*;
    use std::ops::Neg;

    pub fn r#box(fb: &fb, x: isize, y: isize, width: usize, height: usize) -> fb {
      let old = fb;
      let mut fb = fb::new(width, height);
      ops::overlay::replace(&mut fb, old, x.neg(), y.neg());

      return fb;
    }
  }

  pub mod flip {
    use super::*;

    pub fn horizontal(fb: &mut fb) {
      let width = fb.width;
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();
      for y in 0..height { unsafe { std::slice::from_raw_parts_mut(u32.add(y * width), width).reverse(); } }
    }

    pub fn vertical(fb: &mut fb) {
      let width = fb.width;
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();

      for y in 0..(height / 2) {
        let yoffset = y * width;
        let yboffset = width * (height - 1 - y);
        for x in 0..width { unsafe { std::ptr::swap(u32.add(x + yoffset), u32.add(x + yboffset)) }; }
      }
    }
  }

  pub mod fill {
    use super::*;

    pub fn function<F>(fb: &mut fb, f: F) where F: Fn(usize, usize) -> u32 {
      let width = fb.width;
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();

      for y in 0..height {
        let yoffset = y * width;
        for x in 0..width { unsafe { *u32.add(x + yoffset) = f(x, y); } }
      }
    }

    pub fn color(fb: &mut fb, color: colors::rgba) {
      if color.r == color.g && color.r == color.b && color.r == color.a { unsafe { fb.ptr_mut::<u8>().write_bytes(color.r, fb.len()); } }

      else {
        let width = fb.width;
        let height = fb.height;
        let u32 = fb.ptr_mut::<u32>();
        unsafe { std::slice::from_raw_parts_mut(u32, width).fill(color.into()); }
        for y in 1..height { unsafe { u32.copy_to_nonoverlapping(u32.add(y * width), width); } }
      }
    }

    pub fn background(fb: &mut fb, color: colors::rgba) {
      let width = fb.width;
      let bg = color.into();
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();

      for y in 0..height {
        let yoffset = y * width;

        for x in 0..width {
          unsafe {
            let fg = *u32.add(x + yoffset);

            match (fg >> 24) & 0xff {
              0xff => {},
              0x00 => *u32.add(x + yoffset) = bg,
              _ => *u32.add(x + yoffset) = colors::blend(bg, fg),
            }
          }
        }
      }
    }
  }

  pub mod rotate {
    use super::*;

    pub fn rotate180(fb: &mut fb) {
      fb.slice_mut::<u32>().reverse();
    }

    pub fn rotate90(fb: &mut fb) {
      let width = fb.width;
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();
      let o32 = alloc(fb.len()) as *mut u32;
      unsafe { u32.copy_to_nonoverlapping(o32, fb.len() / 4); }


      fb.width = height;
      fb.height = width;

      for y in 0..height {
        let yoffset = y * width;
        let heighty1 = height - 1 - y;
        for x in 0..width { unsafe { *u32.add(heighty1 + x * height) = *o32.add(x + yoffset); } }
      }

      free(o32 as *mut u8, fb.len());
    }

    pub fn rotate270(fb: &mut fb) {
      let width = fb.width;
      let height = fb.height;
      let u32 = fb.ptr_mut::<u32>();
      let o32 = alloc(fb.len()) as *mut u32;
      unsafe { u32.copy_to_nonoverlapping(o32, fb.len() / 4); }

      fb.width = height;
      fb.height = width;

      for y in 0..height {
        let yoffset = y * width;
        for x in 0..width { unsafe { *u32.add(y + height * (width - 1 - x)) = *o32.add(x + yoffset); } }
      }

      free(o32 as *mut u8, fb.len());
    }
  }

  pub mod overlay {
    use super::*;

    pub fn replace(fb: &mut fb, fg: &fb, x: isize, y: isize) {
      let f32 = fg.ptr::<u32>();
      let b32 = fb.ptr_mut::<u32>();
      let (bw, bh) = (fb.width as isize, fb.height as isize);
      let (fw, fh) = (fg.width as isize, fg.height as isize);

      let top = y.max(0);
      let left = x.max(0);
      let ox = x.min(0).abs();
      let oy = y.min(0).abs();
      let width = bw.min(x + fw) - left;
      let height = bh.min(y + fh) - top;
      if 0 >= width || 0 >= height { return; }

      for yy in 0..height {
        let yyoffset = ox + fw * (yy + oy);
        let yoffset = left + bw * (yy + top);
        unsafe { b32.offset(yoffset).copy_from(f32.offset(yyoffset), width as usize); }
      }
    }

    pub fn blend(fb: &mut fb, fg: &fb, x: isize, y: isize) {
      let f32 = fg.ptr::<u32>();
      let b32 = fb.ptr_mut::<u32>();
      let (bw, bh) = (fb.width as isize, fb.height as isize);
      let (fw, fh) = (fg.width as isize, fg.height as isize);

      let top = y.max(0);
      let left = x.max(0);
      let ox = x.min(0).abs();
      let oy = y.min(0).abs();
      let width = bw.min(x + fw) - left;
      let height = bh.min(y + fh) - top;
      if 0 >= width || 0 >= height { return; }

      for yy in 0..height {
        let yyoffset = ox + fw * (yy + oy);
        let yoffset = left + bw * (yy + top);

        for xx in 0..width {
          unsafe {
            let fg = *f32.offset(xx + yyoffset);

            match fg >> 24 {
              0x00 => {},
              0xff => *b32.offset(xx + yoffset) = fg,

              fa => {
                let alpha = 1 + fa;
                let inv_alpha = 256 - fa;
                let bg = *b32.offset(xx + yoffset);
                let r = (alpha * (fg & 0xff) + inv_alpha * (bg & 0xff)) >> 8;
                let g = (alpha * ((fg >> 8) & 0xff) + inv_alpha * ((bg >> 8) & 0xff)) >> 8;
                let b = (alpha * ((fg >> 16) & 0xff) + inv_alpha * ((bg >> 16) & 0xff)) >> 8;
                *b32.offset(xx + yoffset) = r | ((g & 0xff) << 8) | ((b & 0xff) << 16) | (fa.max(bg >> 24) << 24);
              },
            }
          }
        }
      }
    }

    pub fn background(fb: &mut fb, bg: &fb, x: isize, y: isize) {
      let bb32 = bg.ptr::<u32>();
      let b32 = fb.ptr_mut::<u32>();
      let (bw, bh) = (fb.width as isize, fb.height as isize);
      let (fw, fh) = (bg.width as isize, bg.height as isize);

      let top = y.max(0);
      let left = x.max(0);
      let ox = x.min(0).abs();
      let oy = y.min(0).abs();
      let width = bw.min(x + fw) - left;
      let height = bh.min(y + fh) - top;
      if 0 >= width || 0 >= height { return; }

      for yy in 0..height {
        let yyoffset = ox + fw * (yy + oy);
        let yoffset = left + bw * (yy + top);

        for xx in 0..width {
          unsafe {
            let fg = *b32.offset(xx + yoffset);

            match fg >> 24 {
              0xff => {},
              0x00 => *b32.offset(xx + yoffset) = *bb32.offset(xx + yyoffset),

              fa => {
                let alpha = 1 + fa;
                let inv_alpha = 256 - fa;
                let bg = *bb32.offset(xx + yyoffset);
                let r = (alpha * (fg & 0xff) + inv_alpha * (bg & 0xff)) >> 8;
                let g = (alpha * ((fg >> 8) & 0xff) + inv_alpha * ((bg >> 8) & 0xff)) >> 8;
                let b = (alpha * ((fg >> 16) & 0xff) + inv_alpha * ((bg >> 16) & 0xff)) >> 8;
                *b32.offset(xx + yoffset) = r | ((g & 0xff) << 8) | ((b & 0xff) << 16) | (fa.max(bg >> 24) << 24);
              },
            }
          }
        }
      }
    }
  }

  pub mod resize {
    use super::*;

    const fn lerp(a: u8, b: u8, t: f64) -> u8 {
      return ((t * b as f64) + a as f64 * (1.0 - t)) as u8;
    }

    fn clamped(x: usize, y: usize, width: usize, height: usize) -> usize {
      return 4 * (x.clamp(0, width - 1) + width * y.clamp(0, height - 1));
    }

    const fn hermite(a: f64, b: f64, c: f64, d: f64, t: f64) -> f64 {
      let cc = (c / 2.0) + (a / -2.0);
      let bb = a + (c * 2.0) - (d / 2.0) - (b * 2.5);
      let aa = (d / 2.0) + (a / -2.0) + (b * 1.5) - (c * 1.5);

      let t2 = t * t;
      return b + (t * cc) + (bb * t2) + (t * aa * t2);
    }

    pub fn nearest(fb: &fb, width: usize, height: usize) -> fb {
      let owidth = fb.width;
      let oheight = fb.height;
      let o32 = fb.ptr::<u32>();
      let mut fb = framebuffer::new(width, height);

      let u32 = fb.ptr_mut::<u32>();
      let xw = 1.0 / width as f64 * owidth as f64;
      let yw = 1.0 / height as f64 * oheight as f64;

      for y in 0..height {
        let yoffset = y * width;
        let yyoffset = owidth * (yw * y as f64) as usize;
        for x in 0..width { unsafe { *u32.add(x + yoffset) = *o32.add(yyoffset + (xw * x as f64) as usize); } };
      };

      return fb;
    }

    pub unsafe fn linear(fb: &fb, width: usize, height: usize) -> fb {
      let owidth = fb.width;
      let oheight = fb.height;
      let o8 = fb.ptr::<u8>();
      let mut fb = framebuffer::new(width, height);

      let mut offset = 0;
      let u8 = fb.ptr_mut::<u8>();
      let width1 = 1.0 / (width - 1) as f64;
      let height1 = 1.0 / (height - 1) as f64;

      for y in 0..height {
        let yy = oheight as f64 * (y as f64 * height1) - 0.5;

        let yyi = yy as usize;
        let ty = yy - yyi as f64;

        for x in 0..width {
          let xx = owidth as f64 * (x as f64 * width1) - 0.5;

          let xxi = xx as usize;
          let tx = xx - xxi as f64;

          let s0 = clamped(xxi, yyi, owidth, oheight);
          let s1 = clamped(1 + xxi, yyi, owidth, oheight);
          let s2 = clamped(xxi, 1 + yyi, owidth, oheight);
          let s3 = clamped(1 + xxi, 1 + yyi, owidth, oheight);

          // unsafe {
            *u8.offset(offset) = lerp(lerp(*o8.add(s0), *o8.add(s2), tx), lerp(*o8.add(s1), *o8.add(s3), tx), ty);
            *u8.offset(1 + offset) = lerp(lerp(*o8.add(1 + s0), *o8.add(1 + s2), tx), lerp(*o8.add(1 + s1), *o8.add(1 + s3), tx), ty);
            *u8.offset(2 + offset) = lerp(lerp(*o8.add(2 + s0), *o8.add(2 + s2), tx), lerp(*o8.add(2 + s1), *o8.add(2 + s3), tx), ty);
            *u8.offset(3 + offset) = lerp(lerp(*o8.add(3 + s0), *o8.add(3 + s2), tx), lerp(*o8.add(3 + s1), *o8.add(3 + s3), tx), ty);
          // }

          offset += 4;
        };
      };

      return fb;
    }

    pub unsafe fn cubic(fb: &fb, width: usize, height: usize) -> fb {
      let owidth = fb.width;
      let oheight = fb.height;
      let o8 = fb.ptr::<u8>();
      let mut fb = framebuffer::new(width, height);

      let mut offset = 0;
      let u8 = fb.ptr_mut::<u8>();
      let width1 = 1.0 / (width - 1) as f64;
      let height1 = 1.0 / (height - 1) as f64;

      for y in 0..height {
        let yy = oheight as f64 * (y as f64 * height1) - 0.5;

        let yyi = yy as usize;
        let ty = yy - yyi as f64;

        for x in 0..width {
          let xx = owidth as f64 * (x as f64 * width1) - 0.5;

          let xxi = xx as usize;
          let tx = xx - xxi as f64;

          let s0 = clamped(xxi - 1, yyi - 1, owidth, oheight);

          let s1 = clamped(xxi, yyi - 1, owidth, oheight);
          let s2 = clamped(1 + xxi, yyi - 1, owidth, oheight);
          let s3 = clamped(2 + xxi, yyi - 1, owidth, oheight);

          let s4 = clamped(xxi - 1, yyi, owidth, oheight);

          let s5 = clamped(xxi, yyi, owidth, oheight);
          let s6 = clamped(1 + xxi, yyi, owidth, oheight);
          let s7 = clamped(2 + xxi, yyi, owidth, oheight);

          let s8 = clamped(xxi - 1, 1 + yyi, owidth, oheight);

          let s9 = clamped(xxi, 1 + yyi, owidth, oheight);
          let s10 = clamped(1 + xxi, 1 + yyi, owidth, oheight);
          let s11 = clamped(2 + xxi, 1 + yyi, owidth, oheight);

          let s12 = clamped(xxi - 1, 2 + yyi, owidth, oheight);

          let s13 = clamped(xxi, 2 + yyi, owidth, oheight);
          let s14 = clamped(1 + xxi, 2 + yyi, owidth, oheight);
          let s15 = clamped(2 + xxi, 2 + yyi, owidth, oheight);

          // unsafe {
            let c0 = hermite(*o8.add(s0) as f64, *o8.add(s1) as f64, *o8.add(s2) as f64, *o8.add(s3) as f64, tx);
            let c00 = hermite(*o8.add(1 + s0) as f64, *o8.add(1 + s1) as f64, *o8.add(1 + s2) as f64, *o8.add(1 + s3) as f64, tx);
            let c000 = hermite(*o8.add(2 + s0) as f64, *o8.add(2 + s1) as f64, *o8.add(2 + s2) as f64, *o8.add(2 + s3) as f64, tx);
            let c0000 = hermite(*o8.add(3 + s0) as f64, *o8.add(3 + s1) as f64, *o8.add(3 + s2) as f64, *o8.add(3 + s3) as f64, tx);

            let c1 = hermite(*o8.add(s4) as f64, *o8.add(s5) as f64, *o8.add(s6) as f64, *o8.add(s7) as f64, tx);
            let c11 = hermite(*o8.add(1 + s4) as f64, *o8.add(1 + s5) as f64, *o8.add(1 + s6) as f64, *o8.add(1 + s7) as f64, tx);
            let c111 = hermite(*o8.add(2 + s4) as f64, *o8.add(2 + s5) as f64, *o8.add(2 + s6) as f64, *o8.add(2 + s7) as f64, tx);
            let c1111 = hermite(*o8.add(3 + s4) as f64, *o8.add(3 + s5) as f64, *o8.add(3 + s6) as f64, *o8.add(3 + s7) as f64, tx);

            let c2 = hermite(*o8.add(s8) as f64, *o8.add(s9) as f64, *o8.add(s10) as f64, *o8.add(s11) as f64, tx);
            let c22 = hermite(*o8.add(1 + s8) as f64, *o8.add(1 + s9) as f64, *o8.add(1 + s10) as f64, *o8.add(1 + s11) as f64, tx);
            let c222 = hermite(*o8.add(2 + s8) as f64, *o8.add(2 + s9) as f64, *o8.add(2 + s10) as f64, *o8.add(2 + s11) as f64, tx);
            let c2222 = hermite(*o8.add(3 + s8) as f64, *o8.add(3 + s9) as f64, *o8.add(3 + s10) as f64, *o8.add(3 + s11) as f64, tx);

            let c3 = hermite(*o8.add(s12) as f64, *o8.add(s13) as f64, *o8.add(s14) as f64, *o8.add(s15) as f64, tx);
            let c33 = hermite(*o8.add(1 + s12) as f64, *o8.add(1 + s13) as f64, *o8.add(1 + s14) as f64, *o8.add(1 + s15) as f64, tx);
            let c333 = hermite(*o8.add(2 + s12) as f64, *o8.add(2 + s13) as f64, *o8.add(2 + s14) as f64, *o8.add(2 + s15) as f64, tx);
            let c3333 = hermite(*o8.add(3 + s12) as f64, *o8.add(3 + s13) as f64, *o8.add(3 + s14) as f64, *o8.add(3 + s15) as f64, tx);

            *u8.offset(offset) = hermite(c0, c1, c2, c3, ty) as u8;
            *u8.offset(1 + offset) = hermite(c00, c11, c22, c33, ty) as u8;
            *u8.offset(2 + offset) = hermite(c000, c111, c222, c333, ty) as u8;
            *u8.offset(3 + offset) = hermite(c0000, c1111, c2222, c3333, ty) as u8;
          // }

          offset += 4;
        };
      };

      return fb;
    }
  }

  pub mod blur {
    use super::*;

    pub fn gaussian(fb: &mut fb, sigma: f32) {
      if 0.0 == sigma { return; }

      let cof = {
        let a = (0.726f32).powi(2).exp() / sigma;

        let l = (-a).exp();
        let c = (-a * 2.0).exp();
        let k = (1.0 - l).powi(2) / (1.0 - c + a * l * 2.0);

        let a3 = c * -k;
        let b1 = l * 2.0;
        let a1 = l * k * (a - 1.0);
        let a2 = l * k * (a + 1.0);
        (k, a1, a2, a3, b1, -c, (k + a1) / (c - b1 + 1.0), (a2 + a3) / (c - b1 + 1.0))
      };

      let width = fb.width;
      let height = fb.height;

      unsafe {
        let o8 = alloc(fb.len());
        let u8 = fb.ptr_mut::<u8>();
        let f32 = alloc(4 * 4 * width.max(height)) as *mut f32;

        u8.copy_to(o8, fb.len());
        gc(o8, u8, f32, width, height, cof);
        gc(u8, o8, f32, height, width, cof);

        free(o8, fb.len());
        free(f32 as *mut u8, 4 * 4 * width.max(height));
      }
    }

    unsafe fn gc(u8: *mut u8, o8: *mut u8, f32: *mut f32, width: usize, height: usize, (k, a1, a2, a3, b1, b2, lc, rc): (f32, f32, f32, f32, f32, f32, f32, f32)) {
      use std::intrinsics::{fmul_fast as fm, fadd_fast as fa, float_to_int_unchecked as fi};

      let width4 = 4 * width;
      let height4 = 4 * height;
      let hw1 = height * (width - 1);

      for y in 0..height {
        let mut toffset = 0;
        let mut ooffset = y * width4;
        let mut offset = 4 * (y + hw1);

        let (mut por, mut pog, mut pob, mut poa) = (*o8.add(ooffset) as f32, *o8.add(1 + ooffset) as f32, *o8.add(2 + ooffset) as f32, *o8.add(3 + ooffset) as f32);
        let (mut fur, mut fug, mut fub, mut fua) = (fm(lc, por), fm(lc, pog), fm(lc, pob), fm(lc, poa)); let (mut tur, mut tug, mut tub, mut tua) = (fur, fug, fub, fua);

        for _ in 0..width {
          let (cor, cog, cob, coa) = (*o8.add(ooffset) as f32, *o8.add(1 + ooffset) as f32, *o8.add(2 + ooffset) as f32, *o8.add(3 + ooffset) as f32);
          let (cur, cug, cub, cua) = (fm(k, cor) + fm(a1, por) + fm(b1, fur) + fm(b2, tur), fm(k, cog) + fm(a1, pog) + fm(b1, fug) + fm(b2, tug), fm(k, cob) + fm(a1, pob) + fm(b1, fub) + fm(b2, tub), fm(k, coa) + fm(a1, poa) + fm(b1, fua) + fm(b2, tua));

          (tur, tug, tub, tua) = (fur, fug, fub, fua);
          (fur, fug, fub, fua) = (cur, cug, cub, cua);
          (por, pog, pob, poa) = (cor, cog, cob, coa);

          *f32.offset(toffset) = fur;
          *f32.offset(1 + toffset) = fug;
          *f32.offset(2 + toffset) = fub;
          *f32.offset(3 + toffset) = fua;

          ooffset += 4;
          toffset += 4;
        }

        ooffset -= 4;
        toffset -= 4;

        por = *o8.add(ooffset) as f32;
        pog = *o8.add(1 + ooffset) as f32;
        pob = *o8.add(2 + ooffset) as f32;
        poa = *o8.add(3 + ooffset) as f32;
        (tur, tug, tub, tua) = (fm(rc, por), fm(rc, pog), fm(rc, pob), fm(rc, poa));

        (fur, fug, fub, fua) = (tur, tug, tub, tua);
        let (mut cor, mut cog, mut cob, mut coa) = (por, pog, pob, poa);

        for _ in 0..width {
          let (cur, cug, cub, cua) = (fm(a2, cor) + fm(a3, por) + fm(b1, fur) + fm(b2, tur), fm(a2, cog) + fm(a3, pog) + fm(b1, fug) + fm(b2, tug), fm(a2, cob) + fm(a3, pob) + fm(b1, fub) + fm(b2, tub), fm(a2, coa) + fm(a3, poa) + fm(b1, fua) + fm(b2, tua));

          (tur, tug, tub, tua) = (fur, fug, fub, fua);
          (fur, fug, fub, fua) = (cur, cug, cub, cua);
          (por, pog, pob, poa) = (cor, cog, cob, coa);

          cor = *o8.add(ooffset) as f32;
          cog = *o8.add(1 + ooffset) as f32;
          cob = *o8.add(2 + ooffset) as f32;
          coa = *o8.add(3 + ooffset) as f32;
          *u8.add(offset) = fi(fa(fur, *f32.offset(toffset)));
          *u8.add(1 + offset) = fi(fa(fug, *f32.offset(1 + toffset)));
          *u8.add(2 + offset) = fi(fa(fub, *f32.offset(2 + toffset)));
          *u8.add(3 + offset) = fi(fa(fua, *f32.offset(3 + toffset)));

          ooffset = ooffset.saturating_sub(4);
          toffset = toffset.saturating_sub(4);
          offset = offset.saturating_sub(height4);
        }
      }
    }
  }
}