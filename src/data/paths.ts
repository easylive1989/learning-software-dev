/** 把站內路徑加上部署時的 base（GitHub Pages 會放在 /learning-software-dev/ 底下） */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string) {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
