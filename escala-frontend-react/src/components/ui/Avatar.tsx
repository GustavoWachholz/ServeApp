interface AvatarProps {
  nome: string;
  foto?: string | null;
  cor?: string;
  size?: number;
  className?: string;
}

function gerarSvgAvatar(nome: string, cor: string, size: number): string {
  const iniciais = (nome || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  const safe = iniciais
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const fontSize = Math.round(size * 0.375);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" rx="${size / 2}" fill="${cor}"/>` +
    `<text x="${size / 2}" y="${size / 2}" font-family="ui-monospace,SFMono-Regular,Consolas,monospace" font-size="${fontSize}" font-weight="600"` +
    ` fill="white" text-anchor="middle" dominant-baseline="central">${safe}</text>` +
    `</svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

export function Avatar({ nome, foto, cor, size = 40, className }: AvatarProps) {
  const corEfetiva =
    cor ||
    getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() ||
    '#c98aff';
  const src = foto || gerarSvgAvatar(nome, corEfetiva, size);
  return (
    <img
      src={src}
      alt={nome}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
    />
  );
}
