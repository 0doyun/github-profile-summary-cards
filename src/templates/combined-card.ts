import {Card} from './card';
import * as d3 from 'd3';
import * as d3Axis from 'd3-axis';
import {Theme} from '../const/theme';
import {ProfileContribution} from '../github-api/profile-details';
import {StreakStats} from '../utils/streak';

export interface CombinedUserDetail {
    index: number;
    icon: string;
    name: string;
    value: string;
}

const GRAD_AREA = 'combinedAreaGradient';
const GRAD_BAR = 'combinedBarGradient';

export function createCombinedCard(
    title: string,
    userDetails: CombinedUserDetail[],
    contributionsData: ProfileContribution[],
    streakStats: StreakStats,
    productiveTime: number[],
    utcOffset: number,
    theme: Theme
) {
    const width = 820;
    const height = 420;
    const card = new Card(title, width, height, theme);
    const svg = card.getSVG();

    addGradients(svg, theme);

    // Row 1: profile (full width, text left + area chart right)
    drawProfileSection(svg, userDetails, contributionsData, theme, width);
    drawHLine(svg, theme, 30, width - 30, 175);

    // Row 2: streak 3-col (left wide) + productive (right narrow)
    const row2Top = 195;
    const row2Bottom = 380;
    const row2Height = row2Bottom - row2Top;
    const streakX = 20;
    const streakWidth = 300;
    const dividerX = 340;
    const productiveX = 360;
    const productiveWidth = width - productiveX - 20;

    drawStreakRow(svg, streakStats, theme, streakX, row2Top, streakWidth, row2Height);
    drawVLine(svg, theme, dividerX, row2Top, row2Bottom);
    drawProductiveSection(svg, productiveTime, utcOffset, theme, productiveX, row2Top, productiveWidth, row2Height);

    return card.toString();
}

function addGradients(svg: d3.Selection<any, any, null, undefined>, theme: Theme) {
    const defs = svg.append('defs');

    const area = defs
        .append('linearGradient')
        .attr('id', GRAD_AREA)
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');
    area.append('stop').attr('offset', '0%').attr('stop-color', theme.chart).attr('stop-opacity', '0.85');
    area.append('stop').attr('offset', '100%').attr('stop-color', theme.chart).attr('stop-opacity', '0.05');

    const bar = defs
        .append('linearGradient')
        .attr('id', GRAD_BAR)
        .attr('x1', '0')
        .attr('y1', '0')
        .attr('x2', '0')
        .attr('y2', '1');
    bar.append('stop').attr('offset', '0%').attr('stop-color', theme.chart).attr('stop-opacity', '1');
    bar.append('stop').attr('offset', '100%').attr('stop-color', theme.chart).attr('stop-opacity', '0.5');
}

function drawHLine(svg: d3.Selection<any, any, null, undefined>, theme: Theme, x1: number, x2: number, y: number) {
    svg.append('line')
        .attr('x1', x1)
        .attr('y1', y)
        .attr('x2', x2)
        .attr('y2', y)
        .attr('stroke', theme.text)
        .attr('stroke-opacity', 0.12)
        .attr('stroke-width', 1);
}

function drawVLine(svg: d3.Selection<any, any, null, undefined>, theme: Theme, x: number, y1: number, y2: number) {
    svg.append('line')
        .attr('x1', x)
        .attr('y1', y1)
        .attr('x2', x)
        .attr('y2', y2)
        .attr('stroke', theme.text)
        .attr('stroke-opacity', 0.12)
        .attr('stroke-width', 1);
}

function formatNumber(n: number): string {
    return n.toLocaleString('en-US');
}

function drawProfileSection(
    svg: d3.Selection<any, any, null, undefined>,
    userDetails: CombinedUserDetail[],
    contributionsData: ProfileContribution[],
    theme: Theme,
    cardWidth: number
) {
    const panel = svg.append('g').attr('transform', 'translate(30,20)');
    const labelHeight = 14;

    panel
        .selectAll(null)
        .data(userDetails)
        .enter()
        .append('g')
        .attr('transform', d => `translate(0,${labelHeight * d.index * 2})`)
        .attr('width', labelHeight)
        .attr('height', labelHeight)
        .attr('fill', theme.icon)
        .html(d => d.icon);

    panel
        .selectAll(null)
        .data(userDetails)
        .enter()
        .append('text')
        .text(d => d.value)
        .attr('x', labelHeight * 1.5)
        .attr('y', d => labelHeight * d.index * 2 + labelHeight)
        .style('fill', theme.text)
        .style('font-size', `${labelHeight}px`);

    // area chart
    const monthly: {contributionCount: number; date: Date}[] = [];
    const formatter = d3.timeFormat('%Y-%m');
    for (const data of contributionsData) {
        const formatDate = formatter(data.date);
        const normalized = new Date(`${formatDate}-01`);
        const last = monthly.length - 1;
        if (monthly.length === 0 || monthly[last].date.getTime() !== normalized.getTime()) {
            monthly.push({contributionCount: data.contributionCount, date: normalized});
        } else {
            monthly[last].contributionCount += data.contributionCount;
        }
    }

    const chartLeft = 320;
    const chartRight = 60;
    const chartTop = 20;
    const chartWidth = cardWidth - chartLeft - chartRight;
    const chartHeight = 110;

    const chartG = svg.append('g').attr('transform', `translate(${chartLeft},${chartTop})`);

    chartG
        .append('text')
        .text('Contributions in the last year')
        .attr('x', 0)
        .attr('y', -4)
        .style('fill', theme.text)
        .style('font-size', '10px')
        .style('opacity', 0.7);

    const x = d3.scaleTime().range([0, chartWidth]);
    x.domain(<[Date, Date]>d3.extent(monthly, d => d.date));

    const yMax = Math.max(1, ...monthly.map(m => m.contributionCount));
    const y = d3.scaleLinear().range([chartHeight, 0]);
    y.domain([0, yMax]);
    y.nice();

    const area = d3
        .area<{contributionCount: number; date: Date}>()
        .x(d => x(d.date))
        .y0(y(0))
        .y1(d => y(d.contributionCount))
        .curve(d3.curveMonotoneX);

    const line = d3
        .line<{contributionCount: number; date: Date}>()
        .x(d => x(d.date))
        .y(d => y(d.contributionCount))
        .curve(d3.curveMonotoneX);

    chartG.append('path').datum(monthly).attr('fill', `url(#${GRAD_AREA})`).attr('stroke', 'none').attr('d', area);
    chartG
        .append('path')
        .datum(monthly)
        .attr('fill', 'none')
        .attr('stroke', theme.chart)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.95)
        .attr('d', line);

    const xAxis = d3
        .axisBottom<Date>(x)
        .tickFormat(d3.timeFormat('%b'))
        .tickValues(monthly.filter((_, i) => i % 2 === 0).map(d => d.date))
        .tickSize(0);
    const xg = chartG.append('g').attr('transform', `translate(0,${chartHeight + 6})`);
    xg.call(xAxis);
    xg.select('.domain').remove();
    xg.selectAll('text').style('fill', theme.text).style('opacity', 0.7).style('font-size', '9px');

    const yAxis = d3.axisRight(y).ticks(4).tickSize(0);
    const yg = chartG.append('g').attr('transform', `translate(${chartWidth + 6},0)`);
    yg.call(yAxis);
    yg.select('.domain').remove();
    yg.selectAll('text').style('fill', theme.text).style('opacity', 0.7).style('font-size', '9px');
}

function drawStreakRow(
    svg: d3.Selection<any, any, null, undefined>,
    streak: StreakStats,
    theme: Theme,
    xOrigin: number,
    yOrigin: number,
    panelWidth: number,
    panelHeight: number
) {
    const fmt = d3.timeFormat('%b %-d, %Y');
    const fmtShort = d3.timeFormat('%b %-d, %Y');

    const totalSub = streak.firstContribution ? `Since ${fmt(streak.firstContribution)}` : '';
    const currentSub =
        streak.currentStreakStart && streak.currentStreakEnd
            ? `${fmtShort(streak.currentStreakStart)} – ${fmtShort(streak.currentStreakEnd)}`
            : 'No active streak';
    const longestLine =
        streak.longestStreakStart && streak.longestStreakEnd
            ? `Longest streak ${streak.longestStreak}  ·  ${fmtShort(streak.longestStreakStart)} – ${fmtShort(streak.longestStreakEnd)}`
            : `Longest streak ${streak.longestStreak}`;

    const g = svg.append('g').attr('transform', `translate(${xOrigin},${yOrigin})`);
    const leftX = 20;

    // Row 1 — Total Contributions (blue)
    const row1Y = 10;
    g.append('rect')
        .attr('x', leftX - 12)
        .attr('y', row1Y)
        .attr('width', 3)
        .attr('height', 58)
        .attr('rx', 1.5)
        .attr('fill', theme.title);
    g.append('text')
        .text('TOTAL CONTRIBUTIONS')
        .attr('x', leftX)
        .attr('y', row1Y + 14)
        .style('fill', theme.title)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('letter-spacing', '1.5px');
    g.append('text')
        .text(formatNumber(streak.totalContributions))
        .attr('x', leftX)
        .attr('y', row1Y + 60)
        .style('fill', theme.title)
        .style('font-size', '44px')
        .style('font-weight', '700');
    g.append('text')
        .text(totalSub)
        .attr('x', leftX + 115)
        .attr('y', row1Y + 58)
        .style('fill', theme.text)
        .style('font-size', '11px')
        .style('opacity', 0.65);

    // Row 2 — Current Streak (highlighted)
    const row2Y = row1Y + 80;
    g.append('rect')
        .attr('x', leftX - 12)
        .attr('y', row2Y)
        .attr('width', 3)
        .attr('height', 58)
        .attr('rx', 1.5)
        .attr('fill', theme.chart);
    g.append('text')
        .text('CURRENT STREAK')
        .attr('x', leftX)
        .attr('y', row2Y + 14)
        .style('fill', theme.chart)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('letter-spacing', '1.5px');
    g.append('text')
        .text(streak.currentStreak.toString())
        .attr('x', leftX)
        .attr('y', row2Y + 50)
        .style('fill', theme.chart)
        .style('font-size', '34px')
        .style('font-weight', '700');
    g.append('text')
        .text(currentSub)
        .attr('x', leftX + 52)
        .attr('y', row2Y + 48)
        .style('fill', theme.text)
        .style('font-size', '11px')
        .style('opacity', 0.65);
    g.append('text')
        .text(longestLine)
        .attr('x', leftX)
        .attr('y', row2Y + 74)
        .style('fill', theme.text)
        .style('font-size', '10px')
        .style('opacity', 0.55);

    void panelWidth;
    void panelHeight;
}

function drawProductiveSection(
    svg: d3.Selection<any, any, null, undefined>,
    chartData: number[],
    utcOffset: number,
    theme: Theme,
    xOrigin: number,
    yOrigin: number,
    panelWidth: number,
    panelHeight: number
) {
    if (chartData.length !== 24) {
        throw Error('productive time array size should be 24');
    }

    const g = svg.append('g').attr('transform', `translate(${xOrigin},${yOrigin})`);

    const title = `Commits by hour · UTC ${utcOffset >= 0 ? '+' : ''}${utcOffset.toFixed(0)}`;
    g.append('text')
        .text(title)
        .attr('x', 0)
        .attr('y', 14)
        .style('fill', theme.text)
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('letter-spacing', '1.5px')
        .style('opacity', 0.75);

    const chartLeftPad = 24;
    const chartRightPad = 0;
    const chartTop = 30;
    const chartWidth = panelWidth - chartLeftPad - chartRightPad;
    const chartHeight = panelHeight - chartTop - 30;

    const bottomScaleBand = d3.scaleBand<number>().range([0, chartWidth]).padding(0.2);
    const bottomAxis: d3Axis.Axis<number> = d3Axis.axisBottom(bottomScaleBand);
    bottomScaleBand.domain(chartData.map((_, i) => i));

    const yMax = Math.max(1, ...chartData);
    const y = d3.scaleLinear().range([chartHeight, 0]);
    y.domain([0, yMax]);
    y.nice();

    const chart = g.append('g').attr('transform', `translate(${chartLeftPad},${chartTop})`);

    [0.5].forEach(frac => {
        const yy = chartHeight * frac;
        chart
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yy)
            .attr('y2', yy)
            .attr('stroke', theme.text)
            .attr('stroke-opacity', 0.08)
            .attr('stroke-width', 1);
    });

    chart
        .selectAll('.bar')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('fill', `url(#${GRAD_BAR})`)
        .attr('opacity', d => (d === 0 ? 0.15 : 1))
        .attr('rx', 1.5)
        .attr('ry', 1.5)
        .attr('x', (_, i) => bottomScaleBand(i)!)
        .attr('y', d => (d === 0 ? chartHeight - 2 : y(d)))
        .attr('width', bottomScaleBand.bandwidth())
        .attr('height', d => (d === 0 ? 2 : chartHeight - y(d)));

    const xAxis = bottomAxis.tickValues([0, 6, 12, 18]).tickSize(0);
    const xg = chart.append('g').attr('transform', `translate(0,${chartHeight + 4})`);
    xg.call(xAxis);
    xg.select('.domain').remove();
    xg.selectAll('text').style('fill', theme.text).style('opacity', 0.7).style('font-size', '9px');

    const yAxis = d3.axisLeft(y).ticks(3).tickSize(0);
    const yg = chart.append('g').attr('transform', `translate(-4,0)`);
    yg.call(yAxis);
    yg.select('.domain').remove();
    yg.selectAll('text').style('fill', theme.text).style('opacity', 0.7).style('font-size', '9px');
}
