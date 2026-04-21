import {ThemeMap} from '../const/theme';
import {Icon} from '../const/icon';
import {abbreviateNumber} from 'js-abbreviation-number';
import {getProfileDetails, ProfileDetails} from '../github-api/profile-details';
import {getContributionByYear} from '../github-api/contributions-by-year';
import {getProductiveTime} from '../github-api/productive-time';
import {calcStreak} from '../utils/streak';
import {createCombinedCard, CombinedUserDetail} from '../templates/combined-card';

const getProfileDateJoined = (profileDetails: ProfileDetails): string => {
    const s = (unit: number) => (unit === 1 ? '' : 's');
    const now = Date.now();
    const created = new Date(profileDetails.createdAt);
    const diff = new Date(now - created.getTime());
    const years = diff.getUTCFullYear() - new Date(0).getUTCFullYear();
    const months = diff.getUTCMonth() - new Date(0).getUTCMonth();
    const days = diff.getUTCDate() - new Date(0).getUTCDate();
    return years
        ? `${years} year${s(years)} ago`
        : months
          ? `${months} month${s(months)} ago`
          : `${days} day${s(days)} ago`;
};

const buildUserDetails = (profile: ProfileDetails): CombinedUserDetail[] => {
    const details: CombinedUserDetail[] = [
        {
            index: 0,
            icon: Icon.REPOS,
            name: 'Public Repos',
            value: `${abbreviateNumber(profile.totalPublicRepos, 2)} Public Repos`
        },
        {
            index: 1,
            icon: Icon.STAR,
            name: 'Stars',
            value: `${abbreviateNumber(profile.totalStars, 2)} Stars Earned`
        },
        {
            index: 2,
            icon: Icon.CLOCK,
            name: 'JoinedAt',
            value: `Joined GitHub ${getProfileDateJoined(profile)}`
        }
    ];
    if (profile.email) {
        details.push({index: 3, icon: Icon.EMAIL, name: 'Email', value: profile.email});
    } else if (profile.company) {
        details.push({index: 3, icon: Icon.COMPANY, name: 'Company', value: profile.company});
    } else if (profile.location) {
        details.push({index: 3, icon: Icon.LOCATION, name: 'Location', value: profile.location});
    }
    return details;
};

const adjustOffset = (offset: number, roundRobin: {offset: number}): number => {
    if (offset % 1 === 0) {
        return offset;
    } else if ((offset % 1 > 0.29 && offset % 1 < 0.31) || (offset % 1 < -0.29 && offset % 1 > -0.31)) {
        roundRobin.offset = (roundRobin.offset + 1) % 2;
        return roundRobin.offset === 0 ? Math.floor(offset) : Math.ceil(offset);
    } else if ((offset % 1 > 0.44 && offset % 1 < 0.46) || (offset % 1 < -0.44 && offset % 1 > -0.45)) {
        roundRobin.offset = (roundRobin.offset + 1) % 4;
        return roundRobin.offset === 0 ? Math.floor(offset) : Math.ceil(offset);
    } else {
        return Math.floor(offset);
    }
};

const getProductiveBuckets = async (username: string, utcOffset: number, token: string): Promise<number[]> => {
    const until = new Date();
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1);
    const productive = await getProductiveTime(username, until.toISOString(), since.toISOString(), token);
    const buckets = new Array(24).fill(0);
    const roundRobin = {offset: 0};
    for (const time of productive.productiveDate) {
        const hour = new Date(time).getUTCHours();
        const after = adjustOffset(Number(hour) + Number(utcOffset), roundRobin);
        if (after < 0) buckets[24 + after] += 1;
        else if (after > 23) buckets[after - 24] += 1;
        else buckets[after] += 1;
    }
    return buckets;
};

export const getCombinedSVGWithThemeName = async (
    username: string,
    themeName: string,
    utcOffset: number,
    token: string
): Promise<string> => {
    if (!ThemeMap.has(themeName)) throw new Error('Theme does not exist');
    const profile = await getProfileDetails(username, token);
    const productive = await getProductiveBuckets(username, utcOffset, token);
    const streak = calcStreak(profile.contributions);

    // Override total to all-time (last-year window is too narrow)
    const years = (profile.contributionYears || []).slice().sort((a, b) => a - b);
    if (years.length > 0) {
        const yearly = await Promise.all(years.map(y => getContributionByYear(username, y, token)));
        const allTimeTotal = yearly.reduce((sum, y) => sum + y.totalContributions, 0);
        streak.totalContributions = allTimeTotal;
        const earliestYear = years[0];
        const created = new Date(profile.createdAt);
        const yearStart = new Date(`${earliestYear}-01-01T00:00:00Z`);
        streak.firstContribution = created > yearStart ? created : yearStart;
    }

    const userDetails = buildUserDetails(profile);
    const title = profile.name == null ? username : `${username} (${profile.name})`;
    return createCombinedCard(
        title,
        userDetails,
        profile.contributions,
        streak,
        productive,
        utcOffset,
        ThemeMap.get(themeName)!
    );
};
