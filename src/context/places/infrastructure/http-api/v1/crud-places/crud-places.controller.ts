import { Controller, Get, Query } from '@nestjs/common';
import { Client } from '@googlemaps/google-maps-services-js';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger/dist';

@Controller('v1/places')
export class PlacesController {
  private googleClient: Client;
  private readonly apiKey = process.env.API_GOOGLE;

  private readonly defaultColombiaCities = [
    'Cartagena, Colombia',
    'Barranquilla, Colombia',
    'Bogotá, Colombia',
    'Medellín, Colombia',
    'Cali, Colombia',
    'Santa Marta, Colombia',
    'Bucaramanga, Colombia',
    'Pereira, Colombia',
  ];

  constructor() {
    this.googleClient = new Client({});
  }

  @Get('/browser-places')
  @ApiOperation({
    summary: 'Obtener lugares paginados',
    description: 'Obtiene restaurantes paginados basados en ciudad y tipo de lugar'
  })
  @ApiQuery({ name: 'city', required: true, example: 'Bogotá, Colombia', description: 'Ciudad o coordenadas (@lat@lng)' })
  @ApiQuery({ name: 'place', required: false, example: 'sushi', description: 'Tipo de establecimiento a buscar' })
  @ApiQuery({ name: 'pageNo', required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'pageSize', required: false, example: 60, description: 'Resultados por página' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de restaurantes',
    schema: {
      example: {
        success: true,
        message: 'Restaurantes obtenidos exitosamente',
        data: {
          pageNo: 1,
          pageSize: 60,
          data: [{
            placeId: 'ChIJK1l...',
            name: 'Restaurante Ejemplo',
            address: 'Calle 123',
            location: { lat: 4.123, lng: -74.123 },
            rating: 4.5,
            photo: 'https://...',
            types: ['restaurant', 'food']
          }],
          totalResults: 150,
          totalPages: 3
        }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  async getPaginatedPlaces(
    @Query('city') city: string,
    @Query('place') place: string = '',
    @Query('pageNo') pageNo: number = 1,
    @Query('pageSize') pageSize: number = 60, // Increased default page size
  ) {
    try {
      let location = '';
      if (city.includes('@')) {
        const [lat, lng] = city.split('@').map(Number);
        location = `${lat},${lng}`;
      } else {
        // Get city ID
        const cityResponse = await this.googleClient.placeAutocomplete({
          params: {
            input: city,
            key: this.apiKey,
            types: ['(cities)'] as any,
            language: 'es',
          },
        });

        const placeId = cityResponse.data.predictions?.[0]?.place_id;
        if (!placeId)
          throw new Error(`No se encontró un place_id para ${city}`);

        // Get city coordinates
        const detailsResponse = await this.googleClient.placeDetails({
          params: {
            place_id: placeId,
            key: this.apiKey,
            language: 'es' as any,
          },
        });

        const coords = detailsResponse.data.result.geometry?.location;
        if (!coords) throw new Error(`No se encontró ubicación para ${city}`);
        location = `${coords.lat},${coords.lng}`;
      }

      // Array to store all results
      let allResults = [];
      let pageToken = null;
      let iterations = 0;
      const MAX_ITERATIONS = 10; // Increased max iterations

      do {
        const nearbyResponse = await this.googleClient.placesNearby({
          params: {
            location,
            radius: 20000,
            keyword: place || undefined,
            type: 'restaurant',
            key: this.apiKey,
            pagetoken: pageToken || undefined,
          },
        });

        allResults = nearbyResponse.data.results; // Solo mantén los resultados actuales

        pageToken = nearbyResponse.data.next_page_token;

        if (pageToken) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Rompe el loop si es la página solicitada
        if (iterations === pageNo - 1) break;
        iterations++;
      } while (pageToken && iterations < MAX_ITERATIONS);

      // Remove duplicate places based on place_id
      const uniqueResults = Array.from(
        new Map(allResults.map((place) => [place.place_id, place])).values(),
      );

      // Paginate the results
      const offset = (pageNo - 1) * pageSize;
      const paginatedResults = uniqueResults
        .slice(offset, offset + pageSize)
        .map((place) => ({
          placeId: place.place_id,
          name: place.name,
          address: place.vicinity,
          location: place.geometry.location,
          rating: place.rating || null,
          photo: place.photos?.[0]?.photo_reference
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`
            : null,
          types: place.types,
        }));

      return {
        success: true,
        message: 'Restaurantes obtenidos exitosamente',
        data: {
          pageNo,
          pageSize,
          data: paginatedResults,
          totalResults: uniqueResults.length,
          totalPages: Math.ceil(uniqueResults.length / pageSize),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        message: 'Error al obtener restaurantes',
      };
    }
  }

  @Get('/search')
  @ApiOperation({
    summary: 'Buscar ciudades',
    description: 'Busca ciudades principales de Colombia o por término de búsqueda'
  })
  @ApiQuery({ name: 'search', required: false, example: 'Medellín', description: 'Término de búsqueda para ciudades' })
  @ApiResponse({
    status: 200,
    description: 'Lista de ciudades encontradas',
    schema: {
      example: {
        success: true,
        data: [{
          cityId: 'ChIJdd...',
          name: 'Bogotá',
          country: 'Colombia',
          fullName: 'Bogotá, Colombia'
        }],
        message: 'Ciudades encontradas exitosamente'
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  async searchCities(@Query('search') search: string) {
    try {
      // Si no hay término de búsqueda, devolver ciudades de Colombia
      if (!search) {
        const defaultCities = await Promise.all(
          this.defaultColombiaCities.map(async (cityName) => {
            const response = await this.googleClient.placeAutocomplete({
              params: {
                input: cityName,
                key: this.apiKey,
                types: ['(cities)'] as any,
                language: 'es',
              },
            });

            const prediction = response.data.predictions[0];

            return {
              cityId: prediction.place_id,
              name: prediction.structured_formatting.main_text,
              country: prediction.structured_formatting.secondary_text,
              fullName: prediction.description,
            };
          }),
        );

        return {
          success: true,
          data: defaultCities,
          message: 'Ciudades principales de Colombia',
        };
      }

      // Búsqueda normal de ciudades
      const response = await this.googleClient.placeAutocomplete({
        params: {
          input: search,
          key: this.apiKey,
          types: ['(cities)'] as any,
          language: 'es',
        },
      });

      const cities = await Promise.all(
        response.data.predictions.map(async (prediction) => {
          return {
            cityId: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            country: prediction.structured_formatting.secondary_text,
            fullName: prediction.description,
          };
        }),
      );

      return {
        success: true,
        data: cities,
        message: 'Ciudades encontradas exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        errors: error.toString(),
        message: 'Error al buscar ciudades',
      };
    }
  }

  @Get('/search-places')
  @ApiOperation({
    summary: 'Buscar lugares genéricos',
    description: 'Busca cualquier tipo de lugar por término de búsqueda'
  })
  @ApiQuery({ name: 'search', required: true, example: 'Museo del Oro', description: 'Nombre del lugar a buscar' })
  @ApiResponse({
    status: 200,
    description: 'Detalles de lugares encontrados',
    schema: {
      example: {
        success: true,
        data: [{
          placeId: 'ChIJW5...',
          name: 'Museo del Oro',
          address: 'Cra. 6 #15-88',
          location: { lat: 4.123, lng: -74.123 },
          types: ['museum', 'tourist_attraction'],
          rating: 4.8,
          photo: 'https://...',
          fullDescription: 'Museo del Oro, Bogotá, Colombia'
        }],
        message: 'Lugares encontrados exitosamente'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Término de búsqueda requerido' })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  async searchPlaces(@Query('search') search: string) {
    try {
      // Si no hay término de búsqueda, devolver un error
      if (!search) {
        return {
          success: false,
          message: 'Se requiere un término de búsqueda',
          data: [],
        };
      }

      // Búsqueda de lugares usando Places API
      const response = await this.googleClient.placeAutocomplete({
        params: {
          input: search,
          key: this.apiKey,
          language: 'es',
        },
      });

      const places = await Promise.all(
        response.data.predictions.map(async (prediction) => {
          // Obtener detalles adicionales del lugar
          const details = await this.googleClient.placeDetails({
            params: {
              place_id: prediction.place_id,
              key: this.apiKey,
              language: 'es' as any,
              fields: [
                'formatted_address',
                'geometry',
                'type',
                'rating',
                'photo',
              ],
            },
          });

          const place = details.data.result;

          return {
            placeId: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            address: place.formatted_address,
            location: {
              lat: place.geometry?.location?.lat,
              lng: place.geometry?.location?.lng,
            },
            types: place.types,
            rating: place.rating || null,
            photo: place.photos?.[0]?.photo_reference
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.apiKey}`
              : null,
            fullDescription: prediction.description,
          };
        }),
      );

      return {
        success: true,
        data: places,
        message: 'Lugares encontrados exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        errors: error.toString(),
        message: 'Error al buscar lugares',
      };
    }
  }

  @Get('/top-restaurants')
  @Get('/top-restaurants')
  @ApiOperation({
    summary: 'Top restaurantes por ciudad',
    description:
      'Obtiene los 4 mejores restaurantes de las 5 principales ciudades de Colombia',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de restaurantes destacados',
    schema: {
      example: {
        congrats: true,
        data: [
          {
            ciudad: 'Bogotá',
            restaurantes: [
              {
                nombre: 'Restaurante Gourmet',
                calificacion: 4.9,
                direccion: 'Zona G, Calle 70',
                referencia: 'ChIJH7...',
                imagen: 'https://...',
                precio: 'Caro',
              },
            ],
          },
        ],
        message: 'Top 4 restaurantes en las 5 principales ciudades de Colombia',
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  async getTopRestaurants() {
    try {
      const topCities = this.defaultColombiaCities.slice(0, 5); // Primeras 5 ciudades

      const citiesWithRestaurants = await Promise.allSettled(
        topCities.map(async (cityName) => {
          try {
            // Obtener ID de la ciudad
            const autocompleteResponse =
              await this.googleClient.placeAutocomplete({
                params: {
                  input: cityName,
                  key: this.apiKey,
                  types: ['(cities)'] as any,
                  language: 'es',
                },
              });

            const placeId =
              autocompleteResponse.data.predictions?.[0]?.place_id;
            if (!placeId)
              throw new Error(`No se encontró un place_id para ${cityName}`);

            // Obtener coordenadas de la ciudad
            const detailsResponse = await this.googleClient.placeDetails({
              params: {
                place_id: placeId,
                key: this.apiKey,
                language: 'es' as any,
              },
            });

            const location = detailsResponse.data.result.geometry?.location;
            if (!location)
              throw new Error(`No se encontró ubicación para ${cityName}`);

            // Buscar restaurantes cercanos
            const nearbyResponse = await this.googleClient.placesNearby({
              params: {
                location: `${location.lat},${location.lng}`,
                radius: 5000, // Radio de 5km
                type: 'restaurant',
                key: this.apiKey,
                rankby: 'prominence' as any,
              },
            });

            // Ordenar por rating y tomar los 4 mejores
            const topRestaurants = nearbyResponse.data.results
              .filter((restaurant) => restaurant.rating)
              .sort((a, b) => (b.rating || 0) - (a.rating || 0))
              .slice(0, 4)
              .map((restaurant) => ({
                nombre: restaurant.name,
                calificacion: restaurant.rating,
                direccion: restaurant.vicinity,
                referencia: restaurant.place_id,
                imagen: restaurant.photos?.[0]?.photo_reference
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${restaurant.photos[0].photo_reference}&key=${this.apiKey}`
                  : null, // Imagen si está disponible
                precio: this.getPriceLevel(restaurant.price_level),
              }));

            return {
              ciudad: cityName.split(',')[0], // Remueve ", Colombia"
              restaurantes: topRestaurants,
            };
          } catch (error) {
            return { ciudad: cityName, error: error.message };
          }
        }),
      );

      // Filtramos los resultados exitosos
      const datos = citiesWithRestaurants
        .filter((res) => res.status === 'fulfilled')
        .map((res) => (res as PromiseFulfilledResult<any>).value);

      return {
        congrats: true,
        data: datos,
        message: 'Top 4 restaurantes en las 5 principales ciudades de Colombia',
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        message: 'Error obteniendo restaurantes',
      };
    }
  }

  @Get('/search-restaurant')
  @ApiOperation({
    summary: 'Buscar restaurante específico',
    description: 'Obtiene detalles completos de un restaurante por ID o nombre',
  })
  @ApiQuery({
    name: 'search',
    required: true,
    example: 'ChIJH7... o "El Cielo"',
    description: 'ID del lugar o nombre del restaurante',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalles completos del restaurante',
    schema: {
      example: {
        success: true,
        data: {
          placeId: 'ChIJH7...',
          name: 'El Cielo',
          address: 'Cl. 7 #43-203',
          location: { lat: 6.123, lng: -75.123 },
          types: ['restaurant', 'fine_dining'],
          rating: 4.9,
          priceLevel: 'Muy caro',
          totalRatings: 1500,
          website: 'https://elcielo.com',
          openingHours: ['Lunes: 12:30–15:30, 19:00–23:00'],
          photos: [{ url: 'https://...' }],
          reviews: [
            {
              authorName: 'Juan Pérez',
              rating: 5,
              text: 'Experiencia increíble...',
              relativeTimeDescription: 'hace 2 meses',
            },
          ],
        },
        message: 'Restaurante encontrado exitosamente',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Restaurante no encontrado' })
  @ApiResponse({ status: 500, description: 'Error del servidor' })
  async searchRestaurant(@Query('search') search: string) {
    try {
      let placeId: string;

      try {
        await this.googleClient.placeDetails({
          params: {
            place_id: search,
            key: this.apiKey,
            fields: ['place_id'],
          },
        });
        placeId = search;
      } catch (error) {
        // Si no es un ID válido, buscar por texto
        const findPlaceResponse = await this.googleClient.findPlaceFromText({
          params: {
            input: search,
            inputtype: 'textquery' as any,
            fields: ['place_id', 'name', 'formatted_address', 'types'],
            key: this.apiKey,
            language: 'es' as any,
          },
        });

        if (
          !findPlaceResponse.data.candidates ||
          findPlaceResponse.data.candidates.length === 0
        ) {
          return {
            success: false,
            message:
              'No se encontró ningún restaurante con el término proporcionado.',
          };
        }

        placeId = findPlaceResponse.data.candidates[0].place_id;
      }

      // Obtener detalles completos del lugar
      const detailsResponse = await this.googleClient.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
          language: 'es' as any,
          fields: [
            'name',
            'formatted_address',
            'geometry',
            'types',
            'rating',
            'photos',
            'reviews',
            'price_level',
            'website',
            'opening_hours',
            'user_ratings_total',
          ],
        },
      });

      const place = detailsResponse.data.result;

      // Procesar fotos
      const photos =
        place.photos?.map((photo) => ({
          photoReference: photo.photo_reference,
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${this.apiKey}`,
        })) || [];

      // Procesar reseñas
      const reviews =
        place.reviews?.map((review) => ({
          authorName: review.author_name,
          rating: review.rating,
          text: review.text,
          relativeTimeDescription: review.relative_time_description,
          profilePhotoUrl: review.profile_photo_url,
        })) || [];

      // Construir respuesta
      const restaurantDetails = {
        placeId: placeId,
        name: place.name,
        address: place.formatted_address,
        location: place.geometry?.location,
        types: place.types,
        rating: place.rating,
        priceLevel: this.getPriceLevel(place.price_level),
        totalRatings: place.user_ratings_total,
        website: place.website,
        openingHours: place.opening_hours?.weekday_text,
        photos: photos,
        reviews: reviews,
      };

      return {
        success: true,
        data: restaurantDetails,
        message: 'Restaurante encontrado exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        message: 'Error al buscar el restaurante',
      };
    }
  }

  // Función auxiliar para traducir el nivel de precio a texto, con "Moderado" por defecto
  private getPriceLevel(priceLevel?: number): string {
    const priceMapping = {
      0: 'Gratis',
      1: 'Económico',
      2: 'Moderado',
      3: 'Caro',
      4: 'Muy caro',
    };
    return priceMapping[priceLevel ?? 2]; // Si no hay precio, devuelve "Moderado"
  }
}
