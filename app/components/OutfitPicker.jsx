import { Suspense, useState } from 'react';
import { Await } from '@remix-run/react';
import { Image, Money } from '@shopify/hydrogen';

/**
 * @param {{
 *   complementaryProducts: Promise<ComplementaryProductsQuery>;
 * }}
 */
export default function OutfitPicker({complementaryProducts}) {
  const [checkedProducts, setCheckedProducts] = useState([]);

  const handleCheckboxChange = (productId) => {
    if (checkedProducts.includes(productId)) {
      // Unchecked
      setCheckedProducts(checkedProducts.filter((id) => id !== productId));
    } else {
      // Checked
      setCheckedProducts([...checkedProducts, productId]);
    }
  };

  return (
    <div>
      <strong>Create an outfit</strong>
  
      <br />
      <br />

      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={complementaryProducts}>
          {({products}) => (
            <div>
              <div className="recommended-products-grid">
                {products.nodes.map((product) => (
                  <div
                    key={product.id}
                    className="recommended-product"
                  >
                    <Image
                      data={product.images.nodes[0]}
                      aspectRatio="1/1"
                      sizes="(min-width: 45em) 20vw, 50vw"
                    />
                    <div className="recommended-products-info-container">
                      <div>
                        <h4>{product.title}</h4>
                        <small>
                          <Money data={product.priceRange.minVariantPrice} />
                        </small>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            e.stopPropagation();
                            handleCheckboxChange(product.id)
                          }}
                          checked={checkedProducts.includes(product.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <br />

              {checkedProducts != 0 && 
                <div className='selected-products-container'>
                  <ul>
                    {checkedProducts.map((productId) => {
                      // Find the selected product based on productId
                      const selectedProduct = products.nodes.find((product) => product.id === productId);

                      if (selectedProduct) {
                        return (
                          <div key={selectedProduct.id}>
                            <OutfitVariantPicker product={selectedProduct}/>
                          </div>
                        );
                      }

                      return null; // Handle the case where the product is not found
                    })}
                  </ul>
                  <div>
                  <BulkAddItemsButton 
                    selectedItemIds={checkedProducts}
                  >
                    Add {checkedProducts.length} item{checkedProducts.length > 1 ? 's' : ''} to cart
                  </BulkAddItemsButton>
                  </div>
                </div>
              }
              <br />
            </div>
            
          )}
        </Await>
      </Suspense>
    </div>
  );
}

function OutfitVariantPicker({product}) {
  return(
    <li key={product.id}>
      <div>
        <strong>{product.title}</strong> - <Money data={product.priceRange.minVariantPrice} />
      </div>
      <div>
        Small Medium Large
      </div>
      <div>
        Green Olive Ocean Purple
      </div>
    </li>
  );
}

function BulkAddItemsButton({children}) {
  return(
    <button>
      {children}
    </button>
  );
}