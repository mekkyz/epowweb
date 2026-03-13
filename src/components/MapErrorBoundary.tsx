"use client";

import { Component, ReactNode } from "react";
import { Map as MapIcon, Box } from "lucide-react";
import MapPlaceholder from "./MapPlaceholder";

interface Props {
  children: ReactNode;
  fallbackIcon?: "map" | "box";
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Map rendering error:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <MapPlaceholder
          icon={this.props.fallbackIcon === "box" ? Box : MapIcon}
          label={this.props.title || "Map Unavailable"}
          description={
            this.props.description ||
            "Unable to render the map. Try refreshing the page or using a different browser."
          }
        />
      );
    }

    return this.props.children;
  }
}
