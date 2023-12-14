import React from "react";
import { CrossmarkType } from "../types";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import IconButton from "@mui/material/IconButton";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import Avatar from "@mui/material/Avatar/Avatar";
import DeleteIcon from "@mui/icons-material/Delete";
import ListItemText from "@mui/material/ListItemText";
import { ellipsify, getTagList, updateLocalStorage } from "../utils";
import {
  Autocomplete,
  Chip,
  Divider,
  TextField,
  Typography,
} from "@mui/material";

export type RecentViewProps = {
  crossmarks: Record<string, CrossmarkType> | undefined;
  reloadCrossmarks: () => Promise<void> | void;
};

export default function RecentView({
  crossmarks,
  reloadCrossmarks,
}: RecentViewProps) {
  const crossmarksList = React.useMemo(
    () => Object.entries(crossmarks || {}),
    [crossmarks]
  );
  const tagList = React.useMemo(
    () => getTagList(crossmarks || {}),
    [crossmarks]
  );
  const [filterList, setFilterList] = React.useState<string[]>([]);
  if (!crossmarks) {
    return null;
  }
  console.log(filterList);

  return (
    <>
      <Autocomplete
        multiple
        sx={{ margin: "1rem" }}
        id="tag-filter"
        options={tagList}
        freeSolo
        filterSelectedOptions
        limitTags={3}
        onChange={(e, value) => {
          setFilterList(value);
        }}
        renderTags={(value: readonly string[], getTagProps) => {
          return value.map((option: string, index: number) => (
            <Chip
              variant="outlined"
              label={option}
              {...getTagProps({ index })}
            />
          ));
        }}
        renderInput={(params) => {
          return (
            <TextField {...params} label="Tags" placeholder="Filter By Tags" />
          );
        }}
      />
      <List dense={true}>
        {crossmarksList
          .filter(
            ([_, { tags, content, title }]) =>
              filterList.length === 0 ||
              tags.some((tag) => filterList.includes(tag)) ||
              filterList.some(
                (filter) => content.match(filter) || title.match(filter)
              )
          )
          .sort(
            (
              [_, { createDate: firstDate }],
              [__, { createDate: secondDate }]
            ) => Date.parse(secondDate) - Date.parse(firstDate)
          )
          .map(([key, item], index) => {
            const isImageItem = item.tags.includes("image");
            return (
              <>
                <ListItem
                  dense={true}
                  key={key}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => {
                        delete crossmarks[key];
                        updateLocalStorage("crossmarks", crossmarks).then(
                          reloadCrossmarks
                        );
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      variant="rounded"
                      sx={{ bgcolor: item.favicon ? "unset" : undefined }}
                    >
                      {item.favicon || isImageItem ? (
                        <img
                          width={"100%"}
                          src={isImageItem ? item.content : item.favicon}
                          alt={item.title}
                        />
                      ) : (
                        <BookmarkBorderIcon />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={ellipsify(item.title)}
                    primaryTypographyProps={{
                      title: item.title,
                    }}
                    secondary={
                      <>
                        {item.tags.map((tag, index) => (
                          <Typography
                            key={tag}
                            variant="caption"
                            title={`Tag ${tag}`}
                          >
                            {tag + (index < item.tags.length - 1 ? ", " : "")}
                          </Typography>
                        ))}
                        <Typography
                          key={"content-preview"}
                          title={item.content}
                          variant="subtitle2"
                        >
                          {ellipsify(item.content, 25)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>

                {index !== crossmarksList.length - 1 && <Divider />}
              </>
            );
          })}
      </List>
    </>
  );
}
