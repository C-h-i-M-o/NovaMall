import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Category, Product } from "@novamall/shared";

import { BrandMark } from "../ui/brand-mark.js";
import { Button } from "../ui/button.js";
import { StatusMessage } from "../ui/status-message.js";
import { getPublicCategories, getPublicProducts } from "../api/client.js";

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");

  const currentCategoryId = searchParams.get("categoryId") ?? "";
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);

  useEffect(() => {
    let alive = true;
    void getPublicCategories()
      .then((cats) => { if (alive) setCategories(cats); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const fetchProducts = async (): Promise<void> => {
      try {
        const result = await getPublicProducts({
          page: currentPage,
          categoryId: currentCategoryId || undefined,
          keyword: keyword.trim() || undefined,
          sort: currentSort as "newest" | "priceAsc" | "priceDesc" | "relevance" | undefined
        });
        if (alive) {
          setProducts(result.data);
          setTotal(result.meta.total);
          setMessage(result.meta.total === 0 ? "没有找到商品。" : `共 ${result.meta.total} 个商品`);
        }
      } catch {
        if (alive) setMessage("暂时无法加载商品。");
      }
    };
    void fetchProducts();
    return () => { alive = false; };
  }, [currentCategoryId, currentSort, currentPage, keyword]);

  function updateCategory(categoryId: string): void {
    const next = new URLSearchParams(searchParams);
    if (categoryId.length > 0) {
      next.set("categoryId", categoryId);
    } else {
      next.delete("categoryId");
    }
    next.delete("page");
    setSearchParams(next);
  }

  function updateSort(sort: string): void {
    const next = new URLSearchParams(searchParams);
    next.set("sort", sort);
    next.delete("page");
    setSearchParams(next);
  }

  function handleSearch(event: FormEvent): void {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (keyword.trim().length > 0) {
      next.set("keyword", keyword.trim());
    } else {
      next.delete("keyword");
    }
    next.delete("page");
    setSearchParams(next);
  }

  return (
    <main className="catalog-layout">
      <aside className="catalog-sidebar">
        <BrandMark />
        <nav aria-label="商品分类">
          <h3>分类</h3>
          <ul>
            <li>
              <button className={currentCategoryId === "" ? "active" : ""} onClick={() => { updateCategory(""); }}>
                全部商品
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <button className={currentCategoryId === cat.id ? "active" : ""} onClick={() => { updateCategory(cat.id); }}>
                  {cat.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <Link to="/member" className="nav-link">会员中心</Link>
      </aside>

      <section className="catalog-main" aria-labelledby="catalog-title">
        <h1 id="catalog-title">商品列表</h1>

        <form className="search-bar" onSubmit={(event) => { handleSearch(event); }}>
          <input
            aria-label="搜索商品"
            type="search"
            placeholder="搜索商品名称或简介…"
            value={keyword}
            onChange={(event: ChangeEvent<HTMLInputElement>) => { setKeyword(event.target.value); }}
          />
          <Button type="submit">搜索</Button>
        </form>

        <div className="catalog-controls">
          <label className="field">
            <span>排序</span>
            <select aria-label="排序方式" value={currentSort} onChange={(event: ChangeEvent<HTMLSelectElement>) => { updateSort(event.target.value); }}>
              <option value="newest">最新上架</option>
              <option value="priceAsc">价格从低到高</option>
              <option value="priceDesc">价格从高到低</option>
              {keyword.trim().length > 0 ? <option value="relevance">相关度</option> : null}
            </select>
          </label>
          <span>{total} 个商品</span>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <Link to={`/products/${product.id}`}>
                <div className="product-image">
                  {product.imagePath.length > 0 ? (
                    <img src={product.imagePath} alt={product.name} loading="lazy" />
                  ) : (
                    <span className="no-image">暂无图片</span>
                  )}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <span className="product-price">¥{product.price}</span>
                  <span className="product-shop">{product.shopName}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <StatusMessage>{message.length > 0 ? message : "正在加载商品…"}</StatusMessage>
      </section>
    </main>
  );
}
