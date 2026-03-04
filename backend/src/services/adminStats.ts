import * as adminStatsModel from '../models/adminStats.js';

export async function getAll() {
  const [overview, userGrowth, activityByDay, featureAdoption, recentErrors, tableSizes] =
    await Promise.all([
      adminStatsModel.getOverviewStats(),
      adminStatsModel.getUserGrowth(),
      adminStatsModel.getActivityByDay(),
      adminStatsModel.getFeatureAdoption(),
      adminStatsModel.getRecentErrors(),
      adminStatsModel.getTableSizes(),
    ]);

  return {
    overview,
    userGrowth,
    activityByDay,
    featureAdoption,
    recentErrors,
    tableSizes,
  };
}
