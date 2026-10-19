import { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';

export default function ProductImage({ src, name, eager = false }: { src: string; name: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className={`shop-product-media ${src && !failed ? 'has-product-image' : 'is-missing-image'}`}>
    {src && !failed ? <img src={src} alt={name} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} /> :
      <div className="shop-product-placeholder" role="img" aria-label={`צילום המוצר אינו זמין: ${name}`}>
        <ImageSquare size={32} weight="light" aria-hidden="true" />
        <span>צילום המוצר אינו זמין</span>
      </div>}
  </div>;
}
