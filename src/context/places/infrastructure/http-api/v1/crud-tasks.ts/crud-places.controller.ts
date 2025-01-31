import { Controller, Get, Query } from '@nestjs/common';
import { Client } from '@googlemaps/google-maps-services-js';

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

  @Get('/places')
  async getPaginatedPlaces(
    @Query('city') city: string,
    @Query('place') place: string,
    @Query('pageNo') pageNo: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    try {
      let location = '';
      if (city.includes('-')) {
        const [lat, lng] = city.split('-').map(Number);
        location = `${lat},${lng}`;
      } else {
        // Obtener ID de la ciudad
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

        // Obtener coordenadas de la ciudad
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

      const offset = (pageNo - 1) * pageSize;
      const nearbyResponse = await this.googleClient.placesNearby({
        params: {
          location,
          radius: 10000, // Radio de 10km
          keyword: place,
          key: this.apiKey,
        },
      });

      const paginatedResults = nearbyResponse.data.results
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
        data: paginatedResults,
        message: 'Lugares obtenidos exitosamente',
        pagination: {
          pageNo,
          pageSize,
          totalResults: nearbyResponse.data.results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        message: 'Error al obtener lugares',
      };
    }
  }

  @Get('/search')
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
