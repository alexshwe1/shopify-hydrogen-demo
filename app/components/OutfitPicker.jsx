import { Suspense, useState } from 'react';
import { Await, useRouteLoaderData } from '@remix-run/react';
import { Image, Money } from '@shopify/hydrogen';

// Fetch and return API data with a Remix loader function
export async function loader({params, context}) {
  const {handle} = params;
  const {storefront} = context;

  const selectedOptions = getSelectedProductOptions(request).filter(
    (option) =>
      // Filter out Shopify predictive search query params
      !option.name.startsWith('_sid') &&
      !option.name.startsWith('_pos') &&
      !option.name.startsWith('_psq') &&
      !option.name.startsWith('_ss') &&
      !option.name.startsWith('_v') &&
      // Filter out third party tracking params
      !option.name.startsWith('fbclid'),
  );

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  // await the query for the critical product data
  const {product} = await storefront.query(PRODUCT_QUERY, {
    variables: {handle, selectedOptions},
  });

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const firstVariant = product.variants.nodes[0];
  const firstVariantIsDefault = Boolean(
    firstVariant.selectedOptions.find(
      (option) => option.name === 'Title' && option.value === 'Default Title',
    ),
  );

  if (firstVariantIsDefault) {
    product.selectedVariant = firstVariant;
  } else {
    // if no selected variant was returned from the selected options,
    // we redirect to the first variant's url with it's selected options applied
    if (!product.selectedVariant) {
      throw redirectToFirstVariant({product, request});
    }
  }

  const variants = storefront.query(VARIANTS_QUERY, {
    variables: {handle},
  });
  return defer({product, variants});
}

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
  const productData = useRouteLoaderData(`routes/products.$${product.handle}`);

  return(
    <li key={product.id}>
      {console.log(productData)}
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

/**
 * @param {{
 *   product: ProductFragment;
 *   request: Request;
 * }}
 */
function redirectToFirstVariant({product, request}) {
  const url = new URL(request.url);
  const firstVariant = product.variants.nodes[0];

  return redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    {
      status: 302,
    },
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
`;


const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    options {
      name
      values
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
`;