/*!
 * jquery.reporttable. A jQuery Fixed Header/Totals/Columns tab;e
 *
 * Copyright (c) 2013 PMG Worldwide LLC, Chris Alvares
 * http://pmg.co
 *
 * Licensed under MIT
 * http://www.opensource.org/licenses/mit-license.php
 *
 *
 * Launch  : September 2013
 * Version : .1
 * Released: September 2013
 *
 *
 */

(function ($) {

    var ReportTable = function(container, options)
    {
        this.container = $(container);
        this.options = $.extend(true, {}, this.defaultOptions, options);

        this.buildTable();
    }

    //this function will rebuild the table to be converted into a with static columns and a fixed header
    ReportTable.prototype.buildTable = function()
    {
        this.reset();

        this.refreshFunct = $.proxy(this.scroll, this);
        this.resizeFunct = $.proxy(this.resize, this);

        $(window).scroll(this.refreshFunct);
        $(window).resize(this.resizeFunct);

        var scrollEventObject;
        var that = this;
        if (scrollEventObject = this.options.scrollEventObject)  {
            scrollEventObject.scroll(function() {that.scroll()});
        } else {
            this.interval = setInterval($.proxy(this.scroll, this), this.options.pollInterval);
        }
        this.resizeInterval = setInterval($.proxy(this.resize, this), this.options.resizePollInterval);
        this.container.bind("remove", $.proxy(function(){
            clearInterval(this.interval);
            clearInterval(this.resizeInterval);
            $(window).unbind('scroll', this.refreshFunct);
            $(window).unbind('resize', this.resizeFunct);
            this.scroller.remove();
        }, this));

        this.container.on('colFreezeToggle', function (event, index) {
            var widths = that.getOuterWidthsFromFirstRow();

            $('#frozenCols, #frozenHeader, #frozenFooter').find('tr').each(function () {
                var child = $(this).children().eq(index);
                child
                    .toggle()
                    .css({"width":widths[index]});
                if (!child.text().length) {
                    child.html("&nbsp;");
                }
            });

            that.accommodateFrozen($('#frozenCols'));
        });
    }

    ReportTable.prototype.accommodateFrozen = function(table)
    {
        selectedRow = $(table).children().children().first();

        $('#regularContainer').css({"left":$("#frozenContainer").width()});
    }

    ReportTable.prototype.reset = function()
    {
        if(typeof this.header !== 'undefined')
            this.header.remove();
        if(typeof this.footer !== 'undefined')
            this.footer.remove();

        this.container.css({"position":"relative"});
        //this.container.find("thead, tfoot").css("visibility", "hidden");
        this.header = $("<table>")
            .addClass(this.options.cssPrefix+"_header")
            .css({
                "table-layout":"fixed"
            })
            .append(this.container.children("thead").clone(true));

        this.body = this.container.children("tbody");

        this.footer = $("<table>")
            .addClass(this.options.cssPrefix+"_footer")
            .css({
                position:"relative",
                "margin-top":-this.container.children("tfoot").height(),
                "table-layout":"fixed"
            })
            .append(this.container.children("tfoot").clone(true));

        this.frozenCols = this.container.clone()
            .attr("id", "frozenCols");
        this.frozenCols.find("td").hide();

        if(this.options.scrollContainer != null)
            this.createFooterScrollbar();

        this.frozenTable = $("<div>").addClass('inline-block').attr('id', 'frozenContainer');
        this.regularTable = $("<div>").addClass('inline-block').attr('id', 'regularContainer');

        this.frozenHeader = this.header.clone().attr("id", "frozenHeader");
        this.frozenHeader.find("td").hide();
        this.frozenTable.append(this.frozenHeader);

        this.frozenTable.append(this.frozenCols);

        this.frozenFooter = this.footer.clone()
            .attr("id", "frozenFooter");
        this.frozenFooter.find("td").hide();
        this.frozenTable.append(this.frozenFooter);

        this.container.before(this.frozenTable);
        this.container.before(this.regularTable);

        this.regularTable.append(this.container);

        this.container.before(this.header);
        this.container.after(this.footer);

        $(".koddiTableGraph,.koddiComparisonTableGraph").find("thead").css("visibility", "hidden");
        $(".koddiTableGraph").find("tfoot").css("visibility", "hidden");
        this.refresh();
    }

    ReportTable.prototype.refresh = function()
    {
        this.resize();
        this.scroll();
    }

    ReportTable.prototype.scroll = function()
    {
        if ($(window).scrollTop() + $(window).height() > $(document).height()) return;
        this.moveHeader();
        this.moveFooter();
    }

    ReportTable.prototype.moveHeader = function()
    {
        var headers = $("#regularContainer").find(".reporttable_header");
        var offset =
            this.options.offsetHeaderHeight
            - this.container.offset().top;

        if(offset < 0) offset = 0;

        $(".reporttable_header").css("top", offset);
    }

    ReportTable.prototype.moveFooter = function()
    {
        var hasScroller = typeof this.scroller !== 'undefined';

        var startingPosition = this.container.height() +  this.container.offset().top;
        var offset = -(startingPosition - $(window).height()) + $(window).scrollTop() - this.options.offsetFooterHeight;
        if(hasScroller) offset -= this.scroller.height() - 2;

        if(offset > 0 || (offset + this.container.outerHeight()) < 0) offset = 0;
        this.footer.css("top", offset);
        this.frozenFooter.css("top", offset);

        if(hasScroller) {
            this.scroller.css("top", offset - this.scroller.height() - 2);
            this.scroller.width(this.options.scrollContainer.width());
        }
    }

    ReportTable.prototype.resize = function()
    {
        this.resizeHeader();
        this.resizeFooter();
    }

    ReportTable.prototype.resizeHeader = function()
    {
        //take the first row of the table, do not use colgroup here as it is deprecated in html5
        var widths = this.getOuterWidthsFromFirstRow();

        var that = this;
        this.header.width(this.body.width());
        this.header.find("tr").each(function(rowCount) {
            $(this).children().each(function(index) {
                if(index >= widths.length) {
                    return false;
                }
                $(this).css("min-width", widths[index]);
            });
        });

        this.scroller.width(this.options.scrollContainer.width());
        this.scroller.find("."+this.options.cssPrefix + "_scrollbarInner").width(this.container.width());
    }

    ReportTable.prototype.resizeFooter = function()
    {
        //take the first row of the table, do not use colgroup here as it is deprecated in html5
        var widths = this.getWidthsFromFirstRow();
        var that = this;
        this.footer.width(this.body.width());
        this.footer.find("tr").each(function(rowCount) {
            $(this).find("td").each(function(index) {
                if(index >= widths.length) return false;
                $(this).width(widths[index]);
            });
        });
    }

    ReportTable.prototype.createFooterScrollbar = function()
    {
        if(this.options.scrollContainer == null || typeof this.scroller !== 'undefined') {
            return;
        }

        if(this.options.scrollContainer.parent().find("."+this.options.cssPrefix+"_scrollbar").length > 0) {
            this.scroller = this.options.scrollContainer.parent().find("."+this.options.cssPrefix+"_scrollbar");
            return;
        }
        this.scroller = $("<div>").addClass(this.options.cssPrefix + "_scrollbar");
        this.scroller.css({
            "position":"relative",
            "overflow-x":"auto",
            "overflow-y":"hidden",
            "z-index":6,
            "width":this.options.scrollContainer.width()
        });

        var innerScroll = $("<div>").addClass(this.options.cssPrefix + "_scrollbarInner");
        innerScroll.css({
            "width":this.container.width(),
            "height":0
        });

        this.options.scrollContainer.unbind('scroll', this.scrollContainerScrollEvent);
        this.scrollContainerScrollEvent = $.proxy(this.scrollScrollbar, this);
        this.options.scrollContainer.scroll(this.scrollContainerScrollEvent);

        innerScroll.html("&nbsp;");
        this.scroller.scroll($.proxy(this.scrollContainer, this));
        this.scroller.append(innerScroll);
        this.options.scrollContainer.after(this.scroller);
    }

    ReportTable.prototype.scrollContainer = function(event)
    {
        this.options.scrollContainer.scrollLeft(this.scroller.scrollLeft());
    }

    ReportTable.prototype.scrollScrollbar = function(event)
    {
        this.scroller.scrollLeft(this.options.scrollContainer.scrollLeft());
    }

    ReportTable.prototype.getWidthsFromFirstRow = function()
    {
        var firstRow = this.body.find("tr").eq(0);

        var widths = [];
        firstRow.find("td").each(function(index) {
            widths.push($(this).width());
        });

        return widths;
    }

    ReportTable.prototype.getOuterWidthsFromFirstRow = function()
    {
        var firstRow = this.body.find("tr").eq(0);

        var widths = [];
        firstRow.find("td").each(function(index) {
            widths.push($(this).outerWidth());
        });

        return widths;
    }

    ReportTable.prototype.defaultOptions = {
        offsetHeaderHeight:0,
        offsetFooterHeight:0,
        cssPrefix:"reporttable",
        pollInterval:400,
        resizePollInterval:2000,
        headerCell:"th",
        scrollContainer:null,
        scrollEventObject:null
    }

    $.fn.reportTable = function(options)
    {
        return this.each(function() {
            $(this).data("reportTable", new ReportTable(this, options));
        });
    }

    if (typeof define === "function" && define.amd) {
            define(["jquery"], function($) {
                    "use strict";
                    return ReportTable;
       });
    }


})(jQuery);
