import { ApiProperty } from '@nestjs/swagger';
import { RecentDestination } from '@modules/ride/queries/find-my-recent-destinations/find-my-recent-destinations.query-handler';

// A destination of the passenger's completed rides, offered again in
// "Votre trajet".
export class RecentDestinationResponseDto {
  @ApiProperty({ example: 'Gare de Strasbourg' })
  name: string;

  @ApiProperty({ example: 48.5851 })
  latitude: number;

  @ApiProperty({ example: 7.7346 })
  longitude: number;

  static fromReadModel(
    destination: RecentDestination,
  ): RecentDestinationResponseDto {
    const response = new RecentDestinationResponseDto();
    response.name = destination.name;
    response.latitude = destination.latitude;
    response.longitude = destination.longitude;
    return response;
  }
}
