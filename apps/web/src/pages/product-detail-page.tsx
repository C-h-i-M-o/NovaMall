import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Product } from "@novamall/shared";

import { StatusMessage } from "../ui/status-message.js";
import { getProduct } from "../api/client.js";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("正在加载商品详情…");

  useEffect(() => {
    if (productId === undefined) {
      return;
    }
    let alive = true;
    void getProduct(productId)
      .then((p) => {
        if (alive) {
          setProduct(p);
          setMessage("");
        }
      })
      .catch(() => {
        if (alive) {
          setMessage("商品不存在或已下架。");
        }
      });
    return () => { alive = false; };
  }, [productId]);

  if (product === null) {
    return (
      <main className="catalog-layout">
        <section className="catalog-main">
          <Link to="/catalog">← 返回商品列表</Link>
          <StatusMessage>{message}</StatusMessage>
        </section>
      </main>
    );
  }

  return (
    <main className="catalog-layout">
      <section className="catalog-main product-detail" aria-labelledby="product-name">
        <Link to="/catalog">← 返回商品列表</Link>

        <div className="product-detail-image">
          {product.imagePath.length > 0 ? (
            <img src={product.imagePath} alt={product.name} />
          ) : (
            <span className="no-image large">暂无图片</span>
          )}
        </div>

        <div className="product-detail-info">
          <h1 id="product-name">{product.name}</h1>
          <span className="product-price large">¥{product.price}</span>
          <span className="product-shop">{product.shopName}</span>
          <span className="product-category">分类：{product.categoryName}</span>
          <p className="product-description">{product.description}</p>
          <p className="product-stock">库存：{product.stock}</p>
        </div>
      </section>
    </main>
  );
}
