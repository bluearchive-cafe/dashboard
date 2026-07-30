import { describe, it, expect } from 'vitest';
import { resolveUidRoute } from '../src/lib/uid-routing.js';

const resolve = (href) => {
  expect(typeof resolveUidRoute).toBe('function');
  return resolveUidRoute(href);
};

describe('uid-routing', () => {
  it('dash 规范路径直接提供已校验 UID', () => {
    expect(resolve('https://dash.bluearchive.cafe/ABCDEFGH')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'none',
      target: null,
    });
  });

  it('dash 路径尾斜杠跳转到无尾斜杠规范地址', () => {
    expect(resolve('https://dash.bluearchive.cafe/ABCDEFGH/?source=old#panel')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('根路径从旧 uid 查询参数读取并跳转', () => {
    expect(resolve('https://dash.bluearchive.cafe/?uid=ABCDEFGH#panel')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('index.html 从旧 uid 查询参数读取并跳转', () => {
    expect(resolve('https://dash.bluearchive.cafe/index.html?uid=ABCDEFGH')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('路径 UID 优先于冲突的查询参数', () => {
    expect(resolve('https://dash.bluearchive.cafe/ABCDEFGH?uid=ZZZZZZZZ')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('旧 control 查询链接迁移到 dash 路径', () => {
    expect(resolve('https://control.bluearchive.cafe/?uid=ABCDEFGH')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('旧 control 路径链接迁移到 dash 路径', () => {
    expect(resolve('https://control.bluearchive.cafe/ABCDEFGH')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'location',
      target: 'https://dash.bluearchive.cafe/ABCDEFGH',
    });
  });

  it('非生产主机用 history 规范化并继续初始化', () => {
    expect(resolve('http://127.0.0.1:8080/index.html?uid=%20ABCDEFGH%20#panel')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'history',
      target: '/ABCDEFGH',
    });
  });

  it('非生产主机的规范路径无需改写', () => {
    expect(resolve('http://127.0.0.1:8080/ABCDEFGH')).toEqual({
      uid: 'ABCDEFGH',
      hasUid: true,
      isValidUid: true,
      navigation: 'none',
      target: null,
    });
  });

  it('空 UID 保持为空且不导航', () => {
    expect(resolve('https://dash.bluearchive.cafe/?uid=')).toEqual({
      uid: '',
      hasUid: false,
      isValidUid: false,
      navigation: 'none',
      target: null,
    });
  });

  it('小写 UID 是非空无效值', () => {
    expect(resolve('https://dash.bluearchive.cafe/?uid=abcdefgh')).toEqual({
      uid: 'abcdefgh',
      hasUid: true,
      isValidUid: false,
      navigation: 'none',
      target: null,
    });
  });

  it('长度错误的 UID 是非空无效值', () => {
    const result = resolve('https://dash.bluearchive.cafe/ABCDEFG');
    expect(result.uid).toBe('ABCDEFG');
    expect(result.hasUid).toBe(true);
    expect(result.isValidUid).toBe(false);
    expect(result.navigation).toBe('none');
  });

  it('多段路径是非空无效值且路径优先', () => {
    const result = resolve('https://dash.bluearchive.cafe/ABCDEFGH/ZZZZZZZZ?uid=YYYYYYYY');
    expect(result.uid).toBe('ABCDEFGH/ZZZZZZZZ');
    expect(result.hasUid).toBe(true);
    expect(result.isValidUid).toBe(false);
    expect(result.navigation).toBe('none');
  });

  it('错误百分号编码是非空无效值', () => {
    const result = resolve('https://dash.bluearchive.cafe/%ZZ');
    expect(result.uid).toBe('%ZZ');
    expect(result.hasUid).toBe(true);
    expect(result.isValidUid).toBe(false);
    expect(result.navigation).toBe('none');
  });

  it('路径段解码一次后可成为有效 UID', () => {
    const result = resolve('https://dash.bluearchive.cafe/%41BCDEFGH');
    expect(result.uid).toBe('ABCDEFGH');
    expect(result.isValidUid).toBe(true);
    expect(result.navigation).toBe('location');
    expect(result.target).toBe('https://dash.bluearchive.cafe/ABCDEFGH');
  });

  it('路径段不会解码第二次', () => {
    const result = resolve('https://dash.bluearchive.cafe/%2541BCDEFGH');
    expect(result.uid).toBe('%41BCDEFGH');
    expect(result.hasUid).toBe(true);
    expect(result.isValidUid).toBe(false);
    expect(result.navigation).toBe('none');
  });

  it('生产主机名使用精确匹配', () => {
    const result = resolve('https://dash.bluearchive.cafe.example/ABCDEFGH?source=old');
    expect(result.uid).toBe('ABCDEFGH');
    expect(result.navigation).toBe('history');
    expect(result.target).toBe('/ABCDEFGH');
  });

  it('HTTP dash 规范路径迁移到 HTTPS 规范 origin', () => {
    const result = resolve('http://dash.bluearchive.cafe/ABCDEFGH');
    expect(result.uid).toBe('ABCDEFGH');
    expect(result.navigation).toBe('location');
    expect(result.target).toBe('https://dash.bluearchive.cafe/ABCDEFGH');
  });

  it('带端口的 dash 规范路径迁移到无端口规范 origin', () => {
    const result = resolve('https://dash.bluearchive.cafe:8443/ABCDEFGH');
    expect(result.uid).toBe('ABCDEFGH');
    expect(result.navigation).toBe('location');
    expect(result.target).toBe('https://dash.bluearchive.cafe/ABCDEFGH');
  });
});
