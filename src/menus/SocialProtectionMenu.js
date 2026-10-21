import React, { useEffect, useRef, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Button, ClickAwayListener,
  Collapse, Divider, List, ListItem, ListItemIcon, ListItemText,
  MenuItem, MenuList, Paper, Popper, Typography,
} from '@material-ui/core';
import * as Icons from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import { useHistory } from '@openimis/fe-core';
import { resolveMenuEntries } from './menu-entries';

const useStyles = makeStyles((theme) => ({
  heading: {
    fontSize: theme.menu.appBar.fontSize,
    color: theme.palette.text.second,
    paddingTop: theme.menu.appBar.fontSize / 2,
    textTransform: 'none',
  },
  popper: { zIndex: theme.zIndex.modal + 1 },
  paper: { minWidth: 260 },
  flyout: { minWidth: 260, marginLeft: 2 },
  item: { color: theme.palette.primary.main, minHeight: 44 },
  icon: { color: 'inherit', minWidth: 40 },
  child: { paddingLeft: theme.spacing(4) },
  drawer: { width: '100%', display: 'block', padding: 0 },
  drawerHeading: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.secondary.main,
  },
}));

export default function SocialProtectionMenu({
  modulesManager, entries, rights, header, menuId, menuVariant,
  icon, isInitiallyOpen = false,
}) {
  const classes = useStyles();
  const history = useHistory();
  const headingRef = useRef(null);
  const childListRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(isInitiallyOpen);
  const [parent, setParent] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const visibleEntries = resolveMenuEntries(
    entries, modulesManager.getConf('fe-core', 'menus', []), menuId,
    rights, modulesManager.getMenuEntries(),
  );
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const keepFlyoutOpen = () => clearTimeout(closeTimer.current);
  const close = () => {
    keepFlyoutOpen();
    setOpen(false);
    setParent(null);
    setAnchor(null);
  };
  const navigate = (event, route) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    close();
    history.push(route);
  };
  const showFlyout = (event, entry) => {
    keepFlyoutOpen();
    setAnchor(event.currentTarget);
    setParent(entry);
  };
  const deferClose = () => {
    keepFlyoutOpen();
    closeTimer.current = setTimeout(() => { setParent(null); setAnchor(null); }, 180);
  };
  const iconFor = (entry) => {
    const ConfigIcon = entry.menuIcon && Icons[entry.menuIcon];
    return ConfigIcon ? <ConfigIcon /> : entry.icon;
  };
  const renderLink = (entry, drawer = false) => (
    <MenuItem key={entry.id} component="a" role="menuitem" className={classes.item}
      href={`${process.env.PUBLIC_URL || ''}${entry.route}`}
      onClick={(event) => navigate(event, entry.route)}
      onMouseEnter={drawer ? undefined : () => { setParent(null); setAnchor(null); }}>
      <ListItemIcon className={classes.icon}>{iconFor(entry)}</ListItemIcon>
      <ListItemText primary={entry.text} />
    </MenuItem>
  );

  if (menuVariant !== 'AppBar') {
    return (
      <Accordion expanded={drawerOpen} onChange={(_, value) => setDrawerOpen(value)}>
        <AccordionSummary expandIcon={<Icons.ExpandMore />} className={classes.drawerHeading}>
          {icon}<Typography>{header}</Typography>
        </AccordionSummary>
        <AccordionDetails className={classes.drawer}>
          <List>
            {visibleEntries.map((entry) => entry.children ? (
              <React.Fragment key={entry.id}>
                <ListItem button className={classes.item} aria-expanded={parent?.id === entry.id}
                  onClick={() => setParent(parent?.id === entry.id ? null : entry)}>
                  <ListItemIcon className={classes.icon}>{iconFor(entry)}</ListItemIcon>
                  <ListItemText primary={entry.text} />
                  {parent?.id === entry.id ? <Icons.ExpandLess /> : <Icons.ExpandMore />}
                </ListItem>
                <Collapse in={parent?.id === entry.id} unmountOnExit>
                  <List className={classes.child}>{entry.children.map((child) => renderLink(child, true))}</List>
                </Collapse>
              </React.Fragment>
            ) : renderLink(entry, true))}
          </List>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <>
      <Button ref={headingRef} className={classes.heading} aria-haspopup="menu"
        aria-expanded={open} onClick={() => { if (open) close(); else setOpen(true); }}>
        {header}<Icons.ExpandMore />
      </Button>
      <Popper open={open} anchorEl={headingRef.current} placement="bottom-start" className={classes.popper}>
        <ClickAwayListener onClickAway={close}>
          <div onKeyDown={(event) => {
            if (event.key === 'Escape') {
              if (parent) { anchor?.focus(); setParent(null); setAnchor(null); }
              else { close(); headingRef.current?.focus(); }
            }
            if (event.key === 'Tab') close();
          }}>
            <Paper className={classes.paper}>
              <MenuList aria-label={header} autoFocusItem={open}>
                {visibleEntries.flatMap((entry) => entry.children ? (
                  <MenuItem key={entry.id} id={`${menuId}-${entry.id}`} className={classes.item} aria-haspopup="menu"
                    aria-expanded={parent?.id === entry.id}
                    aria-controls={parent?.id === entry.id ? `${menuId}-flyout` : undefined}
                    onMouseEnter={(event) => showFlyout(event, entry)} onMouseLeave={deferClose}
                    onClick={(event) => showFlyout(event, entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowRight') {
                        event.preventDefault(); event.stopPropagation(); showFlyout(event, entry);
                        setTimeout(() => childListRef.current?.querySelector('[role="menuitem"]')?.focus(), 0);
                      }
                    }}>
                    <ListItemIcon className={classes.icon}>{iconFor(entry)}</ListItemIcon>
                    <ListItemText primary={entry.text} /><Icons.ChevronRight />
                  </MenuItem>
                ) : [
                  renderLink(entry),
                  entry.withDivider ? <Divider key={`${entry.id}-divider`} /> : null,
                ])}
              </MenuList>
            </Paper>
            <Popper open={Boolean(parent && anchor)} anchorEl={anchor} placement="right-start"
              disablePortal className={classes.popper} modifiers={{ flip: { enabled: true }, preventOverflow: { boundariesElement: 'viewport' } }}>
              <Paper className={classes.flyout} onMouseEnter={keepFlyoutOpen} onMouseLeave={deferClose}>
                <MenuList ref={childListRef} id={`${menuId}-flyout`}
                  aria-labelledby={parent ? `${menuId}-${parent.id}` : undefined}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft') {
                      event.preventDefault(); event.stopPropagation(); anchor?.focus(); setParent(null); setAnchor(null);
                    }
                  }}>
                  {parent?.children.map((entry) => (
                    <MenuItem key={entry.id} component="a" role="menuitem" className={classes.item}
                      href={`${process.env.PUBLIC_URL || ''}${entry.route}`}
                      onClick={(event) => navigate(event, entry.route)}>
                      <ListItemIcon className={classes.icon}>{entry.icon}</ListItemIcon>
                      <ListItemText primary={entry.text} />
                    </MenuItem>
                  ))}
                </MenuList>
              </Paper>
            </Popper>
          </div>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
